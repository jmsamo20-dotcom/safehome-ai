from fastapi import APIRouter
from core.registry import loaded_plugins

router = APIRouter()


@router.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "service": "safehome-ai",
        "loaded_plugins": loaded_plugins(),
    }
