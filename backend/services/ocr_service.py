"""하위 호환 shim: plugins.kr.ocr_service re-export"""
from plugins.kr.ocr_service import (  # noqa: F401
    check_tesseract,
    extract_text_from_image,
    extract_text_from_pdf,
    extract_text,
    KROCRService,
)
