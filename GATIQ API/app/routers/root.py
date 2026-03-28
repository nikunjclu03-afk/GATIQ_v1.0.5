from fastapi import APIRouter

from ..core.config import SERVICE_ENGINE, SERVICE_VERSION

router = APIRouter()


@router.get("/")
def read_root():
    return {
        "status": "online",
        "service": "GATIQ API",
        "version": SERVICE_VERSION,
        "engine": SERVICE_ENGINE,
        "endpoints": [
            "/health",
            "/jobs/{job_id}",
            "/scan/plate",
            "/scan/plate/jobs",
            "/scan/cctv",
            "/scan/cctv/jobs",
            "/logs/entry",
            "/logs/history",
            "/whitelist",
            "/reports",
            "/reports/jobs",
            "/sync",
            "/sync/jobs",
            "/auth/google/login",
        ],
    }
