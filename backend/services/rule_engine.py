"""
Rule 기반 위험 요소 탐지 엔진
- HIGH 등급: 키워드/패턴 매칭으로 자동 탐지
- MEDIUM 등급: LLM에 전달할 체크 항목 목록 생성
- LOW 등급: 사용자 안내 (수동 확인 필요)
"""

import re
from models.schemas import RiskGrade, DetectedRisk, RiskCategory, AnalysisResult
from data.risk_definitions import RISK_DEFINITIONS


# ── HIGH 등급 키워드 탐지 규칙 ──

KEYWORD_RULES: dict[str, list[str]] = {
    "B-2": ["대항력 포기", "우선변제권 포기", "우선변제권 미행사", "대항력을 행사하지"],
    "B-5": ["보증보험 가입 불가", "보증보험 협조 불가", "보증보험.*거부", "보증보험.*안 함"],
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


def calculate_grade(detected_risks: list[DetectedRisk]) -> tuple[RiskGrade, int]:
    """탐지된 위험 요소들을 기반으로 등급과 점수를 산출"""
    if not detected_risks:
        return RiskGrade.A, 95

    max_severity = max(r.severity for r in detected_risks)
    total_severity = sum(r.severity for r in detected_risks)

    # F등급 트리거: severity 10인 항목이 있으면 즉시 F
    f_triggers = {"C-1", "C-2", "C-4", "A-1", "B-2", "D-1"}
    if any(r.risk_id in f_triggers and r.severity >= 10 for r in detected_risks):
        score = max(5, 20 - total_severity)
        return RiskGrade.F, score

    # D등급 트리거
    d_triggers = {"B-5", "C-3", "C-6", "B-3", "D-4"}
    if any(r.risk_id in d_triggers for r in detected_risks):
        score = max(20, 45 - total_severity)
        return RiskGrade.D, score

    # 나머지 감점제
    score = max(10, 85 - total_severity * 3)

    if score >= 80:
        return RiskGrade.B, score
    elif score >= 60:
        return RiskGrade.C, score
    elif score >= 40:
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
