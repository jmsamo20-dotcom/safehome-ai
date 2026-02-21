"""
Rule 기반 위험 요소 탐지 엔진
- HIGH 등급: 키워드/패턴 매칭으로 자동 탐지
- MEDIUM 등급: LLM에 전달할 체크 항목 목록 생성
- LOW 등급: 사용자 안내 (수동 확인 필요)

Gemini QA 피드백 반영 (2026-02-22):
- F트리거 확장: D-2, B-6, C-6 추가
- E트리거 신설: C-5, C-3
- 시작 점수 100, 차등 감점 체계
"""

import re
from models.schemas import RiskGrade, DetectedRisk, RiskCategory, AnalysisResult
from data.risk_definitions import RISK_DEFINITIONS


# ── HIGH 등급 키워드 탐지 규칙 ──

KEYWORD_RULES: dict[str, list[str]] = {
    "B-2": ["대항력 포기", "우선변제권 포기", "우선변제권 미행사", "대항력을 행사하지"],
    "B-5": ["보증보험 가입 불가", "보증보험 협조 불가", "보증보험.*거부", "보증보험.*안 함"],
    "B-6": ["제소전 화해", "즉시 명도", "무조건 퇴거", "즉시 퇴거", "명도 동의"],
    "C-1": ["압류", "가압류", "가처분"],
    "C-2": ["신탁", "신탁등기", "부동산신탁"],
    "C-3": ["임차권등기"],
    "C-5": ["전세권 설정", "전세권설정"],
    "D-2": ["위반건축물"],
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
    """계약 기간 2년 미만 탐지 (A-3)"""
    # 패턴: "임대차 기간: 12개월" 또는 "계약기간 1년"
    patterns = [
        r"(?:임대차\s*기간|계약\s*기간)[^\d]*(\d+)\s*개월",
        r"(?:임대차\s*기간|계약\s*기간)[^\d]*(\d+)\s*년",
    ]

    for i, pattern in enumerate(patterns):
        match = re.search(pattern, text)
        if match:
            value = int(match.group(1))
            months = value if i == 0 else value * 12
            if months < 24:
                risk_def = next(r for r in RISK_DEFINITIONS if r["id"] == "A-3")
                return DetectedRisk(
                    risk_id="A-3",
                    risk_name=risk_def["name"],
                    category=risk_def["category"],
                    severity=risk_def["severity"],
                    matched_text=match.group(0),
                    explanation=risk_def["description"],
                    suggestion=risk_def["suggestion"],
                )
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
    )
