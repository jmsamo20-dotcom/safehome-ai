import asyncio
import logging
import time
from pathlib import Path

from fastapi import APIRouter, File, UploadFile, HTTPException

from config import ALLOWED_EXTENSIONS, MAX_UPLOAD_SIZE_BYTES
from models.schemas import AnalysisResult
from services.ocr_service import extract_text
from services.rule_engine import detect_by_keywords, detect_contract_period, build_analysis_result
from services.llm_analyzer import analyze_with_llm
from utils.file_manager import create_job_dir

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/api/analyze", response_model=AnalysisResult)
async def analyze_contract(
    contract_image: UploadFile = File(...),
):
    """계약서/등기부등본 이미지를 분석하여 위험도를 반환합니다."""
    t0 = time.time()

    # 파일 검증
    if not contract_image.filename:
        raise HTTPException(400, "파일을 업로드해 주세요.")

    ext = Path(contract_image.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(415, f"지원하지 않는 파일 형식입니다: {ext}. PDF, JPG, PNG만 가능합니다.")

    content = await contract_image.read()
    if len(content) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(413, "파일 크기가 10MB를 초과합니다.")

    job_id, job_dir = create_job_dir()

    try:
        # Step 1: 파일 저장
        upload_path = job_dir / f"upload{ext}"
        upload_path.write_bytes(content)
        logger.info("[%s] Step 1: 파일 저장 완료 (%.1fs)", job_id, time.time() - t0)

        # Step 2: OCR 텍스트 추출
        ocr_text = await asyncio.to_thread(extract_text, upload_path, job_dir)
        logger.info("[%s] Step 2: OCR 완료 - %d자 추출 (%.1fs)", job_id, len(ocr_text), time.time() - t0)

        if not ocr_text or len(ocr_text) < 20:
            raise HTTPException(
                422,
                "문서에서 텍스트를 추출할 수 없습니다. "
                "더 선명한 사진을 업로드하거나, 다른 형식의 파일을 시도해 주세요."
            )

        # Step 3: Rule 기반 탐지 (HIGH 등급)
        rule_detected = detect_by_keywords(ocr_text)
        period_risk = detect_contract_period(ocr_text)
        if period_risk:
            rule_detected.append(period_risk)
        logger.info("[%s] Step 3: Rule 탐지 - %d건 (%.1fs)", job_id, len(rule_detected), time.time() - t0)

        # Step 4: LLM 분석 (MEDIUM 등급 + 계약 정보 추출)
        llm_result = await asyncio.to_thread(analyze_with_llm, ocr_text)
        logger.info("[%s] Step 4: LLM 분석 - %d건 (%.1fs)", job_id, len(llm_result.risks), time.time() - t0)

        # Step 5: 최종 결과 생성
        result = build_analysis_result(
            rule_detected,
            llm_result.risks,
            extracted=llm_result.extracted,
            document_type=llm_result.document_type,
        )
        logger.info(
            "[%s] Step 5: 최종 결과 - 등급 %s, 점수 %d, 위험 %d건 (%.1fs)",
            job_id, result.grade, result.score, len(result.detected_risks), time.time() - t0,
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error("[%s] 분석 실패 (%.1fs): %s", job_id, time.time() - t0, str(e))
        raise HTTPException(500, f"분석 중 오류가 발생했습니다: {str(e)}")
