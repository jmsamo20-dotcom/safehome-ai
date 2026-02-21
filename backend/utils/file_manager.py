import uuid
from pathlib import Path

from config import TEMP_DIR


def create_job_dir() -> tuple[str, Path]:
    """고유 작업 디렉토리 생성"""
    job_id = uuid.uuid4().hex[:12]
    job_dir = Path(TEMP_DIR) / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    return job_id, job_dir
