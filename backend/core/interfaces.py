"""
세이프홈 AI - 국가 플러그인 추상 인터페이스
Strategy Pattern 기반: 국가별 법령/분석 로직을 플러그인으로 분리
"""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any

from models.schemas import DetectedRisk, AnalysisResult, CrossCheckItem


class IRuleEngine(ABC):
    """국가별 Rule 기반 위험 탐지 엔진"""

    @abstractmethod
    def detect(self, text: str) -> list[DetectedRisk]:
        """키워드/패턴 매칭으로 위험 요소 탐지"""
        ...

    @abstractmethod
    def calculate_grade(self, detected: list[DetectedRisk]) -> tuple[str, int]:
        """탐지된 위험을 기반으로 등급(grade)과 점수(score) 산출"""
        ...

    @abstractmethod
    def build_result(
        self,
        rule_detected: list[DetectedRisk],
        llm_detected: list[DetectedRisk] | None,
        extracted: dict | None,
        document_type: str | None,
        cross_checks: list[CrossCheckItem] | None,
        documents_analyzed: list[str] | None,
    ) -> AnalysisResult:
        """Rule + LLM 결과를 합쳐 최종 분석 결과 생성"""
        ...


class ILLMAnalyzer(ABC):
    """국가별 LLM 분석 서비스"""

    @abstractmethod
    def analyze(self, ocr_text: str) -> Any:
        """OCR 텍스트를 LLM으로 분석하여 위험 요소 + 추출 정보 반환"""
        ...


class IOCRService(ABC):
    """국가별 OCR 텍스트 추출 서비스"""

    @abstractmethod
    def extract_text(self, file_path: Path, job_dir: Path) -> str:
        """파일에서 텍스트 추출"""
        ...

    def extract_text_with_confidence(self, file_path: Path, job_dir: Path) -> tuple[str, float]:
        """파일에서 텍스트 + confidence(0~100) 추출. 기본: confidence=-1(미지원)"""
        return self.extract_text(file_path, job_dir), -1.0

    @property
    @abstractmethod
    def supported_extensions(self) -> set[str]:
        """지원하는 파일 확장자 목록"""
        ...


class ICrossValidator(ABC):
    """국가별 다중 문서 교차 검증"""

    @abstractmethod
    def validate(
        self,
        contract_text: str | None,
        registry_text: str | None,
        building_text: str | None,
        extracted: dict | None,
    ) -> list[CrossCheckItem]:
        """문서 간 교차 검증 수행"""
        ...


class ICountryPlugin(ABC):
    """국가별 플러그인 인터페이스 (Facade)"""

    @property
    @abstractmethod
    def country_code(self) -> str:
        """ISO 3166-1 alpha-2 국가 코드 (예: 'KR')"""
        ...

    @property
    @abstractmethod
    def country_name(self) -> str:
        """국가명 (예: '대한민국')"""
        ...

    @abstractmethod
    def get_rule_engine(self) -> IRuleEngine:
        ...

    @abstractmethod
    def get_llm_analyzer(self) -> ILLMAnalyzer:
        ...

    @abstractmethod
    def get_ocr_service(self) -> IOCRService:
        ...

    @abstractmethod
    def get_cross_validator(self) -> ICrossValidator:
        ...

    @abstractmethod
    def get_params(self) -> dict:
        """국가별 파라미터 (최우선변제금, 비율 임계값 등)"""
        ...
