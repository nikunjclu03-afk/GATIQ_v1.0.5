from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..dependencies import get_api_key, get_db
from ..services.ai_runtime import get_health_status
from ..services.job_service import get_queue_stats

router = APIRouter(tags=["health"])


@router.get("/health", dependencies=[Depends(get_api_key)])
def health_check(db: Session = Depends(get_db)):
    health = get_health_status()
    health.update(get_queue_stats(db))
    return health
