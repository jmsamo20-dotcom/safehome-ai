import asyncio
import logging
import time
from pathlib import Path

from fastapi import APIRouter, File, UploadFile, HTTPException, Form

from config import ALLOWED_EXTENSIONS, MAX_UPLOAD_SIZE_BYTES
from models.schemas import AnalysisResult
from core.registry import get_default
from core.pipeline import run_analysis_pipeline
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

        # Step 2: OCR 텍스트 추출 (플러그인의 OCR 서비스 사용)
        plugin = get_default()
        ocr_service = plugin.get_ocr_service()

        contract_text, contract_conf = await asyncio.to_thread(
            ocr_service.extract_text_with_confidence, contract_path, job_dir
        )

        registry_text, registry_conf = (
            await asyncio.to_thread(ocr_service.extract_text_with_confidence, registry_path, job_dir)
            if registry_path else ("", -1.0)
        )
        registry_text = registry_text or None

        building_text, building_conf = (
            await asyncio.to_thread(ocr_service.extract_text_with_confidence, building_path, job_dir)
            if building_path else ("", -1.0)
        )
        building_text = building_text or None

        # 유효한 confidence만 모아 평균 산출
        valid_confs = [c for c in [contract_conf, registry_conf, building_conf] if c >= 0]
        ocr_confidence = round(sum(valid_confs) / len(valid_confs), 1) if valid_confs else None

        logger.info(
            "[%s] Step 2: OCR 완료 - 계약서 %d자(%.0f%%) / 등기부 %s자 / 건축물대장 %s자 (%.1fs)",
            job_id,
            len(contract_text), contract_conf,
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

        # Step 3~6: 분석 파이프라인 (플러그인 기반)
        result = await run_analysis_pipeline(
            plugin=plugin,
            contract_text=contract_text,
            registry_text=registry_text,
            building_text=building_text,
            documents_analyzed=docs_analyzed,
            job_id=job_id,
        )

        # OCR confidence를 결과에 포함
        result.ocr_confidence = ocr_confidence

        logger.info(
            "[%s] 분석 완료 - 등급 %s, 점수 %d (%.1fs)",
            job_id, result.grade, result.score, time.time() - t0,
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error("[%s] 분석 실패 (%.1fs): %s", job_id, time.time() - t0, str(e))
        raise HTTPException(500, f"분석 중 오류가 발생했습니다: {str(e)}")
