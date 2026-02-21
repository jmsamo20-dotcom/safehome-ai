import asyncio
import logging
import time
from pathlib import Path

from fastapi import APIRouter, File, UploadFile, HTTPException, Form

from config import ALLOWED_EXTENSIONS, MAX_UPLOAD_SIZE_BYTES
from models.schemas import AnalysisResult
from services.ocr_service import extract_text
from services.rule_engine import detect_by_keywords, detect_contract_period, build_analysis_result
from services.llm_analyzer import analyze_with_llm
from services.cross_validator import cross_validate
from utils.file_manager import create_job_dir

router = APIRouter()
logger = logging.getLogger(__name__)


async def _validate_and_save(
    file: UploadFile, job_dir: Path, prefix: str
) -> Path | None:
    """파일 검증 후 저장, 실패 시 None 반환"""
    if not file or not file.filename:
        return None

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        return None

    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE_BYTES:
        return None

    path = job_dir / f"{prefix}{ext}"
    path.write_bytes(content)
    return path


@router.post("/api/analyze", response_model=AnalysisResult)
async def analyze_contract(
    contract_image: UploadFile = File(...),
    registry_image: UploadFile | None = File(None),
    building_image: UploadFile | None = File(None),
):
    """계약서 + 등기부등본 + 건축물대장을 분석하여 위험도를 반환합니다."""
    t0 = time.time()

    # 필수: 계약서 검증
    if not contract_image.filename:
        raise HTTPException(400, "계약서 파일을 업로드해 주세요.")

    ext = Path(contract_image.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(415, f"지원하지 않는 파일 형식입니다: {ext}")

    content = await contract_image.read()
    if len(content) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(413, "파일 크기가 10MB를 초과합니다.")

    job_id, job_dir = create_job_dir()

    try:
        # Step 1: 파일 저장
        contract_path = job_dir / f"contract{ext}"
        contract_path.write_bytes(content)

        registry_path = await _validate_and_save(registry_image, job_dir, "registry") if registry_image else None
        building_path = await _validate_and_save(building_image, job_dir, "building") if building_image else None

        docs_analyzed = ["contract"]
        if registry_path:
            docs_analyzed.append("registry")
        if building_path:
            docs_analyzed.append("building")

        logger.info("[%s] Step 1: 파일 저장 - %s (%.1fs)", job_id, docs_analyzed, time.time() - t0)

        # Step 2: OCR 텍스트 추출 (문서별 분리)
        contract_text = await asyncio.to_thread(extract_text, contract_path, job_dir)
        registry_text = await asyncio.to_thread(extract_text, registry_path, job_dir) if registry_path else None
        building_text = await asyncio.to_thread(extract_text, building_path, job_dir) if building_path else None

        logger.info(
            "[%s] Step 2: OCR 완료 - 계약서 %d자 / 등기부 %s자 / 건축물대장 %s자 (%.1fs)",
            job_id,
            len(contract_text),
            len(registry_text) if registry_text else "N/A",
            len(building_text) if building_text else "N/A",
            time.time() - t0,
        )

        if not contract_text or len(contract_text) < 20:
            raise HTTPException(
                422,
                "계약서에서 텍스트를 추출할 수 없습니다. "
                "더 선명한 사진을 업로드해 주세요."
            )

        # Step 3: Rule 기반 탐지 — 모든 텍스트에서 키워드 탐색
        combined_text = contract_text
        if registry_text:
            combined_text += "\n\n[등기부등본]\n" + registry_text
        if building_text:
            combined_text += "\n\n[건축물대장]\n" + building_text

        rule_detected = detect_by_keywords(combined_text)
        period_risk = detect_contract_period(contract_text)
        if period_risk:
            rule_detected.append(period_risk)
        logger.info("[%s] Step 3: Rule 탐지 - %d건 (%.1fs)", job_id, len(rule_detected), time.time() - t0)

        # Step 4: LLM 분석 — 문서 컨텍스트 분리 전달
        llm_input = f"[계약서]\n{contract_text}"
        if registry_text:
            llm_input += f"\n\n[등기부등본]\n{registry_text}"
        if building_text:
            llm_input += f"\n\n[건축물대장]\n{building_text}"

        llm_result = await asyncio.to_thread(analyze_with_llm, llm_input)
        logger.info("[%s] Step 4: LLM 분석 - %d건 (%.1fs)", job_id, len(llm_result.risks), time.time() - t0)

        # Step 5: 교차 검증
        cross_checks = cross_validate(
            contract_text, registry_text, building_text,
            extracted=llm_result.extracted,
        )
        logger.info("[%s] Step 5: 교차 검증 - %d건 (%.1fs)", job_id, len(cross_checks), time.time() - t0)

        # Step 6: 최종 결과 생성
        result = build_analysis_result(
            rule_detected,
            llm_result.risks,
            extracted=llm_result.extracted,
            document_type=llm_result.document_type,
            cross_checks=cross_checks,
            documents_analyzed=docs_analyzed,
        )
        logger.info(
            "[%s] Step 6: 최종 결과 - 등급 %s, 점수 %d, 위험 %d건, 교차검증 %d건 (%.1fs)",
            job_id, result.grade, result.score,
            len(result.detected_risks), len(cross_checks),
            time.time() - t0,
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error("[%s] 분석 실패 (%.1fs): %s", job_id, time.time() - t0, str(e))
        raise HTTPException(500, f"분석 중 오류가 발생했습니다: {str(e)}")
