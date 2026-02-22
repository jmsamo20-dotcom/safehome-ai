from enum import Enum
from typing import Any
from pydantic import BaseModel


class RiskGrade(str, Enum):
    A = "A"  # 안전
    B = "B"  # 양호
    C = "C"  # 보통
    D = "D"  # 주의
    E = "E"  # 위험
    F = "F"  # 매우 위험


class RiskCategory(str, Enum):
    CONTRACT = "contract"        # 카테고리 A: 계약서 본문
    SPECIAL_TERMS = "special"    # 카테고리 B: 특약 사항
    REGISTRY = "registry"        # 카테고리 C: 등기부등본
    SITUATION = "situation"      # 카테고리 D: 상황 정보


class DetectionLevel(str, Enum):
    HIGH = "high"    # Rule 기반 자동 탐지
    MEDIUM = "medium"  # LLM 문맥 분석 필요
    LOW = "low"      # 수동 확인 필요


class RiskItem(BaseModel):
    id: str
    name: str
    category: RiskCategory
    description: str
    legal_basis: str
    detection_level: DetectionLevel
    severity: int  # 1~10, F등급 트리거는 10
    suggestion: str  # 방어 특약 문구


class DetectedRisk(BaseModel):
    risk_id: str
    risk_name: str
    category: RiskCategory
    severity: int
    matched_text: str  # 계약서에서 매칭된 원문
    explanation: str  # 쉬운 말 설명
    suggestion: str  # 수정 특약 제안
    standard_risk_code: str | None = None  # SSRI 표준 코드 (예: SSRI-001)


class CrossCheckStatus(str, Enum):
    OK = "ok"
    WARNING = "warning"
    DANGER = "danger"


class CrossCheckItem(BaseModel):
    label: str          # "임대인 = 소유자"
    status: CrossCheckStatus
    detail: str         # "일치" / "불일치 — 사기 가능성"
    source: str = ""    # "계약서 ↔ 등기부" 등


class AnalysisResult(BaseModel):
    grade: RiskGrade
    score: int  # 0~100 (100이 가장 안전)
    detected_risks: list[DetectedRisk]
    summary: str  # 전체 요약 (쉬운 말)
    extracted: dict[str, Any] | None = None  # LLM이 추출한 계약 정보
    document_type: str | None = None  # 문서 유형 추정
    cross_checks: list[CrossCheckItem] | None = None  # 교차 검증 결과
    documents_analyzed: list[str] | None = None  # ["contract", "registry", ...]
    analysis_mode: str = "hybrid"  # "hybrid" (Rule+LLM) | "rule_only" (LLM 실패 시)
    disclaimer: str = (
        "본 분석은 AI 기반 참고 정보이며, 법률 자문이 아닙니다. "
        "정확한 판단을 위해 법률 전문가 상담을 권장합니다."
    )
