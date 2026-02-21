"""
세이프홈 AI - 한국 플러그인 (레퍼런스 구현)
주택임대차보호법 기반 전월세 계약 위험 분석
"""

import json
from pathlib import Path

from core.interfaces import (
    ICountryPlugin,
    IRuleEngine,
    ILLMAnalyzer,
    IOCRService,
    ICrossValidator,
)
from core.standard_schema import StandardRiskCode
from plugins.kr.rule_engine import KRRuleEngine
from plugins.kr.llm_analyzer import KRLLMAnalyzer
from plugins.kr.ocr_service import KROCRService
from plugins.kr.cross_validator import KRCrossValidator


# ── 한국 위험 코드 → SSRI 표준 매핑 (25개) ──

KR_SSRI_MAP: dict[str, str] = {
    # Category A: 계약서 본문
    "A-1": StandardRiskCode.SSRI_001,   # 임대인 신원 불일치 → 소유자 불일치
    "A-2": StandardRiskCode.SSRI_004,   # 보증금 표기 불일치
    "A-3": StandardRiskCode.SSRI_010,   # 임대차 기간 2년 미만 → 단기 계약
    "A-4": StandardRiskCode.SSRI_014,   # 장기수선충당금 전가 → 유지보수 전가
    # Category B: 특약 사항
    "B-1": StandardRiskCode.SSRI_005,   # 차임감액 청구권 포기 → 법적 권리 포기 강요
    "B-2": StandardRiskCode.SSRI_005,   # 우선변제권 포기 → 법적 권리 포기 강요
    "B-3": StandardRiskCode.SSRI_011,   # 임대인 체납 책임 전가 → 세금 체납 전가
    "B-4": StandardRiskCode.SSRI_014,   # 원상복구 범위 확장 → 유지보수 전가
    "B-5": StandardRiskCode.SSRI_013,   # 보증보험 가입 협조 거부
    "B-6": StandardRiskCode.SSRI_006,   # 즉시 명도 동의 강요 → 강제 퇴거 조항
    # Category C: 등기부등본
    "C-1": StandardRiskCode.SSRI_007,   # 압류/가압류/가처분
    "C-2": StandardRiskCode.SSRI_008,   # 신탁등기 → 신탁 부담
    "C-3": StandardRiskCode.SSRI_009,   # 임차권등기명령 이력 → 선순위 임차 청구권
    "C-4": StandardRiskCode.SSRI_003,   # 과다 근저당 → 과다 담보 부채
    "C-5": StandardRiskCode.SSRI_009,   # 선순위 전세권 → 선순위 임차 청구권
    "C-6": StandardRiskCode.SSRI_015,   # 당일 권리 변동
    # Category D: 상황 정보
    "D-1": StandardRiskCode.SSRI_003,   # 깡통전세 징후 → 과다 담보 부채
    "D-2": StandardRiskCode.SSRI_012,   # 위반 건축물
    "D-3": StandardRiskCode.SSRI_001,   # 대리인 계약 위험 → 소유자 불일치
    "D-4": StandardRiskCode.SSRI_002,   # 전대차 위험
    "D-5": StandardRiskCode.SSRI_011,   # 세금 체납 위험 → 세금 체납 전가
}


class KoreaPlugin(ICountryPlugin):
    """한국 플러그인: 주택임대차보호법 기반 분석"""

    def __init__(self):
        self._rule_engine = KRRuleEngine()
        self._llm_analyzer = KRLLMAnalyzer()
        self._ocr_service = KROCRService()
        self._cross_validator = KRCrossValidator()

        # params.json 로드
        params_path = Path(__file__).parent / "params.json"
        if params_path.exists():
            self._params = json.loads(params_path.read_text(encoding="utf-8"))
        else:
            self._params = {"country_code": "KR", "currency": "KRW"}

    @property
    def country_code(self) -> str:
        return "KR"

    @property
    def country_name(self) -> str:
        return "대한민국"

    def get_rule_engine(self) -> IRuleEngine:
        return self._rule_engine

    def get_llm_analyzer(self) -> ILLMAnalyzer:
        return self._llm_analyzer

    def get_ocr_service(self) -> IOCRService:
        return self._ocr_service

    def get_cross_validator(self) -> ICrossValidator:
        return self._cross_validator

    def get_params(self) -> dict:
        return self._params


# 레지스트리가 자동 스캔할 인스턴스
PLUGIN = KoreaPlugin()
