"""
세이프홈 AI - 국가 무관 분석 파이프라인
6단계 오케스트레이터: 플러그인 인터페이스에만 의존
"""

import asyncio
import logging
import time
from pathlib import Path

from core.interfaces import ICountryPlugin
from models.schemas import AnalysisResult

logger = logging.getLogger(__name__)


async def run_analysis_pipeline(
    plugin: ICountryPlugin,
    contract_text: str,
    registry_text: str | None,
    building_text: str | None,
    documents_analyzed: list[str],
    job_id: str,
) -> AnalysisResult:
    """국가 무관 6단계 분석 파이프라인

    Step 1-2 (파일 저장, OCR)는 라우터에서 처리 (파일 I/O 관련)
    Step 3-6 (분석)은 이 파이프라인에서 처리
    """
    t0 = time.time()

    rule_engine = plugin.get_rule_engine()
    llm_analyzer = plugin.get_llm_analyzer()
    cross_validator = plugin.get_cross_validator()

    # Step 3: Rule 기반 탐지 — 모든 텍스트에서 키워드 탐색
    combined_text = contract_text
    if registry_text:
        combined_text += "\n\n[등기부등본]\n" + registry_text
    if building_text:
        combined_text += "\n\n[건축물대장]\n" + building_text

    rule_detected = rule_engine.detect(combined_text)
    logger.info("[%s] Step 3: Rule 탐지 - %d건 (%.1fs)", job_id, len(rule_detected), time.time() - t0)

    # Step 4: LLM 분석 — 문서 컨텍스트 분리 전달
    llm_input = f"[계약서]\n{contract_text}"
    if registry_text:
        llm_input += f"\n\n[등기부등본]\n{registry_text}"
    if building_text:
        llm_input += f"\n\n[건축물대장]\n{building_text}"

    llm_result = await asyncio.to_thread(llm_analyzer.analyze, llm_input)
    llm_available = llm_result.extracted is not None or len(llm_result.risks) > 0
    logger.info("[%s] Step 4: LLM 분석 - %d건, extracted=%s (%.1fs)",
                job_id, len(llm_result.risks), "yes" if llm_result.extracted else "no", time.time() - t0)

    # Step 5: 교차 검증
    cross_checks = cross_validator.validate(
        contract_text, registry_text, building_text,
        extracted=llm_result.extracted,
    )
    logger.info("[%s] Step 5: 교차 검증 - %d건 (%.1fs)", job_id, len(cross_checks), time.time() - t0)

    # Step 6: 최종 결과 생성
    result = rule_engine.build_result(
        rule_detected,
        llm_result.risks,
        extracted=llm_result.extracted,
        document_type=llm_result.document_type,
        cross_checks=cross_checks,
        documents_analyzed=documents_analyzed,
    )

    # standard_risk_code 매핑 (플러그인에 SSRI 맵이 있는 경우)
    try:
        from plugins.kr import KR_SSRI_MAP
        for risk in result.detected_risks:
            if risk.risk_id in KR_SSRI_MAP:
                risk.standard_risk_code = KR_SSRI_MAP[risk.risk_id]
    except (ImportError, AttributeError):
        pass

    # analysis_mode 설정
    if not llm_available:
        result.analysis_mode = "rule_only"

    logger.info(
        "[%s] Step 6: 최종 결과 - 등급 %s, 점수 %d, 위험 %d건, 교차검증 %d건, mode=%s (%.1fs)",
        job_id, result.grade, result.score,
        len(result.detected_risks), len(cross_checks),
        result.analysis_mode, time.time() - t0,
    )

    return result
