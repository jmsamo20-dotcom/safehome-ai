"""
Rule 기반 위험 요소 탐지 엔진 (한국)
- HIGH 등급: 키워드/패턴 매칭으로 자동 탐지
- MEDIUM 등급: LLM에 전달할 체크 항목 목록 생성
- LOW 등급: 사용자 안내 (수동 확인 필요)

Gemini QA 피드백 반영 (2026-02-22):
- F트리거 확장: D-2, B-6, C-6 추가
- E트리거 신설: C-5, C-3
- 시작 점수 100, 차등 감점 체계
"""

import re
from models.schemas import RiskGrade, DetectedRisk, RiskCategory, AnalysisResult, CrossCheckItem
from plugins.kr.risk_definitions import RISK_DEFINITIONS
from core.interfaces import IRuleEngine


# ── HIGH 등급 키워드 탐지 규칙 ──

KEYWORD_RULES: dict[str, list[str]] = {
    "B-2": [
        "대항력 포기", "우선변제권 포기", "우선변제권 미행사", "대항력을 행사하지",
        "일체의 이의를 제기하지", "순위 보전을 요구하지", "후순위임을 인정",
    ],
    "B-5": ["보증보험 가입 불가", "보증보험 협조 불가", "보증보험.*거부", "보증보험.*안 함"],
    "B-6": [
        "제소전 화해", "즉시 명도", "무조건 퇴거", "즉시 퇴거", "명도 동의",
        "자진 퇴거", "강제집행에 동의", "명도 소송 없이", "열쇠를 반납",
    ],
    "C-1": [
        "압류", "가압류", "가처분", "경매개시결정", "예고등기",
        "가등기", "환매특약", "신청사건 처리 중",
    ],
    "C-2": [
        "신탁", "신탁등기", "부동산신탁",
        "수탁자", "위탁자", "신탁원부", "우선수익자",
    ],
    "C-3": ["임차권등기"],
    "C-5": ["전세권 설정", "전세권설정"],
    "D-2": ["위반건축물", "무단 용도변경", "불법 건축"],
    "D-3": ["포괄적 위임", "실제 소유주 별도", "가족 명의", "무권 대리"],
    "D-5": ["당해세", "완납증명서 생략", "조세채권", "체납"],
}


def detect_by_keywords(text: str) -> list[DetectedRisk]:
    """키워드 매칭 기반 위험 요소 탐지 (HIGH 등급)"""
    detected = []
    text_lower = text.strip()

    for risk_id, keywords in KEYWORD_RULES.items():
        for keyword in keywords:
            matches = list(re.finditer(keyword, text_lower))
            if matches:
                risk_def = next(r for r in RISK_DEFINITIONS if r["id"] == risk_id)
                # 매칭된 텍스트 주변 50자 추출
                match = matches[0]
                start = max(0, match.start() - 25)
                end = min(len(text_lower), match.end() + 25)
                snippet = text_lower[start:end]

                detected.append(DetectedRisk(
                    risk_id=risk_id,
                    risk_name=risk_def["name"],
                    category=risk_def["category"],
                    severity=risk_def["severity"],
                    matched_text=f"...{snippet}...",
                    explanation=risk_def["description"],
                    suggestion=risk_def["suggestion"],
                ))
                break  # 같은 risk_id는 한 번만

    return detected


def detect_contract_period(text: str) -> DetectedRisk | None:
    """계약 기간 2년 미만 탐지 (A-3)

    탐지 방법:
    1. "임대차 기간: 12개월" / "계약기간 1년" (명시적 기간)
    2. 시작일~종료일 날짜 차이 계산 (실제 계약서 형태)
    """
    from datetime import datetime

    risk_def = next(r for r in RISK_DEFINITIONS if r["id"] == "A-3")

    # 방법 1: "N개월" / "N년" 명시적 기간
    explicit_patterns = [
        r"(?:임대차\s*기간|계약\s*기간)[^\d]*(\d+)\s*개월",
        r"(?:임대차\s*기간|계약\s*기간)[^\d]*(\d+)\s*년",
    ]
    for i, pattern in enumerate(explicit_patterns):
        match = re.search(pattern, text)
        if match:
            value = int(match.group(1))
            months = value if i == 0 else value * 12
            if months < 24:
                return DetectedRisk(
                    risk_id="A-3",
                    risk_name=risk_def["name"],
                    category=risk_def["category"],
                    severity=risk_def["severity"],
                    matched_text=match.group(0),
                    explanation=risk_def["description"],
                    suggestion=risk_def["suggestion"],
                )

    # 방법 2: 시작일~종료일 날짜 파싱
    # "2026년 3월 1일 ~ 2027년 2월 28일", "2026.03.01 ~ 2027.02.28" 등
    date_pattern = r"(\d{4})\s*[년./-]\s*(\d{1,2})\s*[월./-]\s*(\d{1,2})\s*일?"
    date_range = re.search(
        date_pattern + r"\s*[~부\-–—]\s*" + date_pattern,
        text,
    )
    if date_range:
        try:
            start = datetime(int(date_range.group(1)), int(date_range.group(2)), int(date_range.group(3)))
            end = datetime(int(date_range.group(4)), int(date_range.group(5)), int(date_range.group(6)))
            diff_days = (end - start).days
            if 0 < diff_days < 730:  # 2년 = 730일
                months = round(diff_days / 30.44)
                # 경계값 처리: 23개월 이상이면 소프트 경고 (severity 낮춤)
                near_boundary = diff_days >= 720  # 2년에서 10일 이내
                severity = 3 if near_boundary else risk_def["severity"]
                if near_boundary:
                    explanation = (
                        f"계약 기간이 약 {months}개월로, 2년(주택임대차보호법 보호 기간)에 "
                        f"근접하지만 미달합니다. 계약서의 시작일/종료일을 다시 확인해 주세요."
                    )
                else:
                    explanation = f"{risk_def['description']} (감지된 기간: 약 {months}개월)"
                return DetectedRisk(
                    risk_id="A-3",
                    risk_name=risk_def["name"],
                    category=risk_def["category"],
                    severity=severity,
                    matched_text=date_range.group(0),
                    explanation=explanation,
                    suggestion=risk_def["suggestion"],
                )
        except (ValueError, OverflowError):
            pass

    return None


# ── 등급 트리거 정의 ──

# F등급 (Critical): 발견 즉시 계약 중단 권고
F_TRIGGERS = {"C-1", "C-2", "C-4", "A-1", "B-2", "D-1", "D-2", "B-6", "C-6"}

# E등급 (Very High): 보증금 미회수 고위험
E_TRIGGERS = {"C-5", "C-3"}

# D등급 (High): 심각한 주의 필요
D_TRIGGERS = {"B-5", "B-3", "D-4"}


def _calculate_deductions(detected_risks: list[DetectedRisk]) -> int:
    """위험도 기반 차등 감점
    - severity 9~10: -20점 (치명적 위험)
    - severity 7~8:  -12점 (높은 위험)
    - severity 5~6:  -7점  (중간 위험)
    - severity 1~4:  -3점  (낮은 위험)
    """
    deduction = 0
    for risk in detected_risks:
        if risk.severity >= 9:
            deduction += 20
        elif risk.severity >= 7:
            deduction += 12
        elif risk.severity >= 5:
            deduction += 7
        else:
            deduction += 3
    return deduction


def calculate_grade(detected_risks: list[DetectedRisk]) -> tuple[RiskGrade, int]:
    """탐지된 위험 요소들을 기반으로 등급과 점수를 산출"""
    if not detected_risks:
        return RiskGrade.A, 95

    # ── F등급 트리거 (severity >= 7인 F항목 발견 시) ──
    has_f = any(r.risk_id in F_TRIGGERS and r.severity >= 7 for r in detected_risks)
    if has_f:
        f_count = sum(1 for r in detected_risks if r.risk_id in F_TRIGGERS)
        score = max(5, 20 - f_count * 3)
        return RiskGrade.F, score

    # ── E등급 트리거 ──
    has_e = any(r.risk_id in E_TRIGGERS for r in detected_risks)
    if has_e:
        score = max(15, 35 - len(detected_risks) * 3)
        return RiskGrade.E, score

    # ── D등급 트리거 ──
    has_d = any(r.risk_id in D_TRIGGERS for r in detected_risks)
    if has_d:
        score = max(25, 48 - len(detected_risks) * 3)
        return RiskGrade.D, score

    # ── 일반 감점제 (시작점 100) ──
    deduction = _calculate_deductions(detected_risks)
    score = max(10, 100 - deduction)

    if score >= 85:
        return RiskGrade.B, score
    elif score >= 65:
        return RiskGrade.C, score
    elif score >= 45:
        return RiskGrade.D, score
    else:
        return RiskGrade.E, score


def build_analysis_result(
    rule_detected: list[DetectedRisk],
    llm_detected: list[DetectedRisk] | None = None,
    extracted: dict | None = None,
    document_type: str | None = None,
    cross_checks: list | None = None,
    documents_analyzed: list[str] | None = None,
) -> AnalysisResult:
    """Rule + LLM 결과를 합쳐서 최종 분석 결과 생성"""
    all_detected = rule_detected.copy()
    if llm_detected:
        # LLM 결과에서 중복 제거
        existing_ids = {r.risk_id for r in all_detected}
        for r in llm_detected:
            if r.risk_id not in existing_ids:
                all_detected.append(r)

    grade, score = calculate_grade(all_detected)

    # 요약 생성
    if grade in (RiskGrade.A, RiskGrade.B):
        summary = "전반적으로 안전한 계약입니다. 아래 참고 사항을 확인해 주세요."
    elif grade == RiskGrade.C:
        summary = "몇 가지 주의할 점이 있습니다. 아래 항목을 꼼꼼히 확인하세요."
    elif grade == RiskGrade.D:
        summary = "주의가 필요한 계약입니다. 문제 조항을 반드시 수정한 후 계약하세요."
    elif grade == RiskGrade.E:
        summary = "위험 요소가 많은 계약입니다. 법률 전문가 상담을 강력히 권장합니다."
    else:
        summary = "매우 위험한 계약입니다. 이 계약은 재고하시기 바랍니다."

    return AnalysisResult(
        grade=grade,
        score=score,
        detected_risks=all_detected,
        summary=summary,
        extracted=extracted,
        document_type=document_type,
        cross_checks=cross_checks,
        documents_analyzed=documents_analyzed,
    )


# ── 정규식 기반 계약 정보 추출 ──

def extract_contract_info(text: str) -> dict:
    """OCR 텍스트에서 기본 계약 정보를 정규식으로 추출 (LLM 불필요)"""
    info: dict = {}

    # 임대인 성명
    m = re.search(r"임대인[:\s]*(?:성명[:\s]*)?([\uac00-\ud7a3]{2,4})", text)
    if m:
        info.setdefault("landlord", {})["name"] = m.group(1)

    # 임차인 성명
    m = re.search(r"임차인[:\s]*(?:성명[:\s]*)?([\uac00-\ud7a3]{2,4})", text)
    if m:
        info.setdefault("tenant", {})["name"] = m.group(1)

    # 보증금
    patterns_deposit = [
        r"보증금[:\s]*금?\s*([\d,]+)\s*원",
        r"보증금[:\s]*금?\s*([\uac00-\ud7a3]+원)",
        r"보증금[:\s]*[^\d]*([\d,]{4,})",
    ]
    for p in patterns_deposit:
        m = re.search(p, text)
        if m:
            info.setdefault("money", {})["deposit"] = m.group(1).strip()
            break

    # 월세/차임
    patterns_rent = [
        r"(?:월세|차임|월\s*임대료)[:\s]*금?\s*([\d,]+)\s*원",
        r"(?:월세|차임|월\s*임대료)[:\s]*없음",
    ]
    for p in patterns_rent:
        m = re.search(p, text)
        if m:
            val = m.group(0)
            if "없음" in val:
                info.setdefault("money", {})["rent"] = "없음 (전세)"
            else:
                info.setdefault("money", {})["rent"] = m.group(1).strip() + "원"
            break

    # 소재지/주소
    m = re.search(r"소재지[:\s]*([\uac00-\ud7a3\s\d\-]+(?:동|로|길|호)[\s\d\-]*)", text)
    if m:
        info.setdefault("property", {})["address"] = m.group(1).strip()

    # 계약 기간 (시작일 ~ 종료일)
    date_pat = r"(\d{4})\s*[년./-]\s*(\d{1,2})\s*[월./-]\s*(\d{1,2})\s*일?"
    date_range = re.search(date_pat + r"\s*[~부\-–—]\s*" + date_pat, text)
    if date_range:
        start = f"{date_range.group(1)}년 {date_range.group(2)}월 {date_range.group(3)}일"
        end = f"{date_range.group(4)}년 {date_range.group(5)}월 {date_range.group(6)}일"
        info.setdefault("term", {})["start_date"] = start
        info["term"]["end_date"] = end

    return info if info else None


# ── 어댑터: IRuleEngine 인터페이스 구현 ──

class KRRuleEngine(IRuleEngine):
    """한국 Rule 기반 위험 탐지 엔진 (어댑터)"""

    def detect(self, text: str) -> list[DetectedRisk]:
        detected = detect_by_keywords(text)
        period_risk = detect_contract_period(text)
        if period_risk:
            detected.append(period_risk)
        return detected

    def calculate_grade(self, detected: list[DetectedRisk]) -> tuple[str, int]:
        grade, score = calculate_grade(detected)
        return grade.value, score

    def build_result(
        self,
        rule_detected: list[DetectedRisk],
        llm_detected: list[DetectedRisk] | None,
        extracted: dict | None,
        document_type: str | None,
        cross_checks: list[CrossCheckItem] | None,
        documents_analyzed: list[str] | None,
    ) -> AnalysisResult:
        return build_analysis_result(
            rule_detected, llm_detected, extracted,
            document_type, cross_checks, documents_analyzed,
        )
