"""
OCR 서비스: 이미지/PDF에서 텍스트 추출 (한국)
- OpenCV 전처리 (그레이스케일, 이진화, 노이즈 제거, 기울기 보정)
- Tesseract OCR (한국어 + 영어)
- 문자별 confidence 측정
- PDF: pdftotext 직접 추출 → 실패 시 이미지 변환 후 OCR
"""

import logging
import subprocess
import shutil
from pathlib import Path

import numpy as np
import cv2
from PIL import Image
import pytesseract

from core.interfaces import IOCRService

logger = logging.getLogger(__name__)


def check_tesseract() -> bool:
    """Tesseract 설치 여부 확인"""
    return shutil.which("tesseract") is not None


# ── OpenCV 이미지 전처리 ──

def preprocess_image(img_array: np.ndarray) -> np.ndarray:
    """OCR 정확도를 높이기 위한 이미지 전처리 파이프라인

    1. 그레이스케일 변환
    2. 리사이즈 (너무 작으면 확대)
    3. 노이즈 제거 (bilateral filter)
    4. 적응형 이진화 (조명 불균일 대응)
    5. 기울기 보정 (deskew)
    """
    # 1. 그레이스케일
    if len(img_array.shape) == 3:
        gray = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
    else:
        gray = img_array.copy()

    # 2. 리사이즈 — 짧은 변이 1500px 미만이면 확대
    h, w = gray.shape[:2]
    min_dim = min(h, w)
    if min_dim < 1500:
        scale = 1500 / min_dim
        gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
        logger.info("이미지 확대: %dx%d → %dx%d (x%.1f)", w, h, gray.shape[1], gray.shape[0], scale)

    # 3. 노이즈 제거 (bilateral: 엣지 보존하면서 노이즈 제거)
    denoised = cv2.bilateralFilter(gray, 9, 75, 75)

    # 4. 적응형 이진화 (조명 불균일한 사진에 강건)
    binary = cv2.adaptiveThreshold(
        denoised, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        blockSize=31,
        C=10,
    )

    # 5. 기울기 보정 (deskew)
    binary = _deskew(binary)

    return binary


def _deskew(img: np.ndarray) -> np.ndarray:
    """이미지 기울기 보정 (Hough Line 기반)"""
    try:
        edges = cv2.Canny(img, 50, 150, apertureSize=3)
        lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=100,
                                minLineLength=100, maxLineGap=10)
        if lines is None or len(lines) < 5:
            return img

        # 수평에 가까운 선들의 각도 중앙값 계산
        angles = []
        for line in lines:
            x1, y1, x2, y2 = line[0]
            angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
            if abs(angle) < 15:  # 수평에 가까운 선만
                angles.append(angle)

        if not angles:
            return img

        median_angle = np.median(angles)
        if abs(median_angle) < 0.5:  # 0.5도 미만이면 보정 불필요
            return img

        # 회전 보정
        h, w = img.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, median_angle, 1.0)
        rotated = cv2.warpAffine(img, M, (w, h),
                                 flags=cv2.INTER_CUBIC,
                                 borderMode=cv2.BORDER_REPLICATE)
        logger.info("기울기 보정: %.1f도", median_angle)
        return rotated

    except Exception as e:
        logger.warning("기울기 보정 실패 (무시): %s", str(e))
        return img


# ── OCR 추출 + confidence 측정 ──

def extract_text_from_image(image_path: Path) -> tuple[str, float]:
    """이미지에서 텍스트 추출. (텍스트, confidence) 반환"""
    if not check_tesseract():
        logger.warning("Tesseract not found, returning empty text")
        return "", 0.0

    try:
        # PIL로 읽고 numpy 변환
        pil_img = Image.open(image_path)
        img_array = np.array(pil_img)

        # OpenCV 전처리
        processed = preprocess_image(img_array)

        # PIL로 다시 변환 (pytesseract 입력용)
        pil_processed = Image.fromarray(processed)

        # Tesseract OCR (한국어 + 영어)
        text = pytesseract.image_to_string(
            pil_processed,
            lang="kor+eng",
            config="--psm 6",
        )

        # Confidence 측정
        confidence = _measure_confidence(pil_processed)

        logger.info("OCR 완료: %d자, confidence=%.1f%%", len(text), confidence)
        return text.strip(), confidence

    except Exception as e:
        logger.error("OCR 실패: %s", str(e))
        return "", 0.0


def _measure_confidence(pil_img: Image.Image) -> float:
    """Tesseract의 문자별 confidence를 측정하여 평균 반환"""
    try:
        data = pytesseract.image_to_data(
            pil_img,
            lang="kor+eng",
            config="--psm 6",
            output_type=pytesseract.Output.DICT,
        )

        confidences = []
        for i, conf in enumerate(data["conf"]):
            conf_val = int(conf)
            text = data["text"][i].strip()
            # confidence가 0 이상이고 실제 텍스트가 있는 것만
            if conf_val > 0 and text:
                confidences.append(conf_val)

        if not confidences:
            return 0.0

        return sum(confidences) / len(confidences)

    except Exception as e:
        logger.warning("Confidence 측정 실패: %s", str(e))
        return -1.0  # 측정 불가


# ── PDF 처리 ──

def extract_text_from_pdf(pdf_path: Path, job_dir: Path) -> tuple[str, float]:
    """PDF에서 텍스트 추출. (텍스트, confidence) 반환"""
    # 텍스트 기반 PDF → confidence 100%
    try:
        result = subprocess.run(
            ["pdftotext", str(pdf_path), "-"],
            capture_output=True, text=True, timeout=30, encoding='utf-8',
        )
        if result.stdout.strip():
            logger.info("PDF 텍스트 직접 추출: %d자", len(result.stdout))
            return result.stdout.strip(), 100.0  # 텍스트 PDF는 완벽
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    # 이미지 기반 PDF → OCR
    try:
        img_prefix = str(job_dir / "page")
        subprocess.run(
            ["pdftoppm", "-png", "-r", "300", str(pdf_path), img_prefix],
            capture_output=True, timeout=60,
        )

        texts = []
        confidences = []
        for img_file in sorted(job_dir.glob("page-*.png")):
            text, conf = extract_text_from_image(img_file)
            if text:
                texts.append(text)
                if conf > 0:
                    confidences.append(conf)
            img_file.unlink()

        combined = "\n".join(texts)
        avg_conf = sum(confidences) / len(confidences) if confidences else 0.0
        logger.info("PDF OCR 완료: %d자, %d페이지, confidence=%.1f%%",
                     len(combined), len(texts), avg_conf)
        return combined, avg_conf

    except Exception as e:
        logger.error("PDF 처리 실패: %s", str(e))
        return "", 0.0


# ── 통합 인터페이스 ──

def extract_text(file_path: Path, job_dir: Path) -> tuple[str, float]:
    """파일 확장자에 따라 적절한 OCR 방법 선택. (텍스트, confidence) 반환"""
    ext = file_path.suffix.lower()

    if ext == ".pdf":
        return extract_text_from_pdf(file_path, job_dir)
    elif ext in (".jpg", ".jpeg", ".png"):
        return extract_text_from_image(file_path)
    else:
        logger.error("지원하지 않는 파일 형식: %s", ext)
        return "", 0.0


# ── 어댑터: IOCRService 인터페이스 구현 ──

class KROCRService(IOCRService):
    """한국 OCR 서비스 (어댑터)"""

    def extract_text(self, file_path: Path, job_dir: Path) -> str:
        text, _conf = extract_text(file_path, job_dir)
        return text

    def extract_text_with_confidence(self, file_path: Path, job_dir: Path) -> tuple[str, float]:
        return extract_text(file_path, job_dir)

    @property
    def supported_extensions(self) -> set[str]:
        return {".jpg", ".jpeg", ".png", ".pdf"}
