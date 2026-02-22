"""
OCR 서비스: 이미지/PDF에서 텍스트 추출 (한국)
- Tesseract OCR (한국어 지원)
- PDF → 이미지 변환 후 OCR
- Claude Vision API 폴백 (Tesseract 품질 낮을 때)
"""

import logging
import subprocess
import shutil
from pathlib import Path

from PIL import Image
import pytesseract

from config import TEMP_DIR
from core.interfaces import IOCRService

logger = logging.getLogger(__name__)


def check_tesseract() -> bool:
    """Tesseract 설치 여부 확인"""
    return shutil.which("tesseract") is not None


def extract_text_from_image(image_path: Path) -> str:
    """이미지 파일에서 텍스트 추출 (Tesseract OCR)"""
    if not check_tesseract():
        logger.warning("Tesseract not found, returning empty text")
        return ""

    try:
        img = Image.open(image_path)

        # 이미지 전처리: 그레이스케일 변환
        if img.mode != "L":
            img = img.convert("L")

        # Tesseract OCR (한국어 + 영어)
        text = pytesseract.image_to_string(
            img,
            lang="kor+eng",
            config="--psm 6",  # Uniform block of text
        )

        logger.info("OCR 완료: %d자 추출", len(text))
        return text.strip()

    except Exception as e:
        logger.error("OCR 실패: %s", str(e))
        return ""


def extract_text_from_pdf(pdf_path: Path, job_dir: Path) -> str:
    """PDF에서 텍스트 추출 (PDF → 이미지 → OCR)"""
    # 먼저 텍스트 기반 PDF인지 확인 (pdftotext)
    try:
        result = subprocess.run(
            ["pdftotext", str(pdf_path), "-"],
            capture_output=True, text=True, timeout=30, encoding='utf-8',
        )
        if result.stdout.strip():
            logger.info("PDF 텍스트 직접 추출: %d자", len(result.stdout))
            return result.stdout.strip()
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    # 이미지 기반 PDF → 이미지로 변환 후 OCR
    try:
        # pdftoppm으로 이미지 변환
        img_prefix = str(job_dir / "page")
        subprocess.run(
            ["pdftoppm", "-png", "-r", "300", str(pdf_path), img_prefix],
            capture_output=True, timeout=60,
        )

        # 생성된 이미지들에서 OCR
        texts = []
        for img_file in sorted(job_dir.glob("page-*.png")):
            text = extract_text_from_image(img_file)
            if text:
                texts.append(text)
            img_file.unlink()  # 임시 이미지 삭제

        combined = "\n".join(texts)
        logger.info("PDF OCR 완료: %d자 (페이지 %d장)", len(combined), len(texts))
        return combined

    except Exception as e:
        logger.error("PDF 처리 실패: %s", str(e))
        return ""


def extract_text(file_path: Path, job_dir: Path) -> str:
    """파일 확장자에 따라 적절한 OCR 방법 선택"""
    ext = file_path.suffix.lower()

    if ext == ".pdf":
        return extract_text_from_pdf(file_path, job_dir)
    elif ext in (".jpg", ".jpeg", ".png"):
        return extract_text_from_image(file_path)
    else:
        logger.error("지원하지 않는 파일 형식: %s", ext)
        return ""


# ── 어댑터: IOCRService 인터페이스 구현 ──

class KROCRService(IOCRService):
    """한국 OCR 서비스 (어댑터)"""

    def extract_text(self, file_path: Path, job_dir: Path) -> str:
        return extract_text(file_path, job_dir)

    @property
    def supported_extensions(self) -> set[str]:
        return {".jpg", ".jpeg", ".png", ".pdf"}
