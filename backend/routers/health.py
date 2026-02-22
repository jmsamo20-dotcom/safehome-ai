import shutil

from fastapi import APIRouter
from config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL
from core.registry import loaded_plugins

router = APIRouter()


@router.get("/api/health")
async def health_check():
    tesseract_path = shutil.which("tesseract")
    pdftotext_path = shutil.which("pdftotext")

    return {
        "status": "ok",
        "service": "safehome-ai",
        "loaded_plugins": loaded_plugins(),
        "capabilities": {
            "llm": bool(ANTHROPIC_API_KEY),
            "llm_model": ANTHROPIC_MODEL if ANTHROPIC_API_KEY else None,
            "ocr": tesseract_path is not None,
            "pdf": pdftotext_path is not None,
        },
    }
