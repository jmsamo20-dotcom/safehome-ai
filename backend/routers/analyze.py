import logging
import time
from pathlib import Path

from fastapi import APIRouter, File, UploadFile, HTTPException

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/api/analyze")
async def analyze_contract(
    contract_image: UploadFile = File(...),
):
    """계약서/등기부등본 이미지를 분석하여 위험도를 반환합니다."""
    t0 = time.time()

    # TODO: Step 1 - OCR로 텍스트 추출
    # TODO: Step 2 - Rule 기반 위험 요소 탐지
    # TODO: Step 3 - LLM 분석 (Claude API)
    # TODO: Step 4 - 위험도 등급 산출
    # TODO: Step 5 - 수정 특약 생성

    logger.info("분석 완료 (%.1fs)", time.time() - t0)

    return {
        "status": "not_implemented",
        "message": "분석 엔진 구현 예정",
    }
