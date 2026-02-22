import logging
import sys
import os
from contextlib import asynccontextmanager

# UTF-8 강제 설정 (Docker 환경 호환)
os.environ.setdefault("PYTHONUTF8", "1")
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.registry import load_all_plugins
from routers import analyze, health

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_all_plugins()
    logger.info("세이프홈 AI 시작 - 플러그인 로드 완료")
    yield


app = FastAPI(
    title="세이프홈 AI",
    description="전월세 계약 리스크 분석 서비스",
    version="0.3.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://safehome-ai.vercel.app",
        "http://localhost:3000",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(analyze.router)
