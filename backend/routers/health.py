import shutil

from fastapi import APIRouter
from config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL
from core.registry import loaded_plugins

router = APIRouter()


@router.get("/api/health")
async def health_check():
    tesseract_path = shutil.which("tesseract")
    pdftotext_path = shutil.which("pdftotext")

    import sys

    # API 키 형식 검증 (한글 등 비정상 문자 포함 여부)
    key_info = None
    if ANTHROPIC_API_KEY:
        key_len = len(ANTHROPIC_API_KEY)
        has_non_ascii = any(ord(c) > 127 for c in ANTHROPIC_API_KEY)
        first_non_ascii_pos = None
        first_non_ascii_char = None
        if has_non_ascii:
            for i, c in enumerate(ANTHROPIC_API_KEY):
                if ord(c) > 127:
                    first_non_ascii_pos = i
                    first_non_ascii_char = repr(c)
                    break
        key_info = {
            "length": key_len,
            "prefix": ANTHROPIC_API_KEY[:10] + "...",
            "has_non_ascii": has_non_ascii,
            "first_non_ascii_pos": first_non_ascii_pos,
            "first_non_ascii_char": first_non_ascii_char,
        }

    return {
        "status": "ok",
        "service": "safehome-ai",
        "version": "0.3.0",
        "loaded_plugins": loaded_plugins(),
        "capabilities": {
            "llm": bool(ANTHROPIC_API_KEY),
            "llm_model": ANTHROPIC_MODEL if ANTHROPIC_API_KEY else None,
            "ocr": tesseract_path is not None,
            "pdf": pdftotext_path is not None,
        },
        "encoding": {
            "stdout": getattr(sys.stdout, 'encoding', 'unknown'),
            "stderr": getattr(sys.stderr, 'encoding', 'unknown'),
            "fs": sys.getfilesystemencoding(),
            "default": sys.getdefaultencoding(),
        },
        "api_key_check": key_info,
    }
