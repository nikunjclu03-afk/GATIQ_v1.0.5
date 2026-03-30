"""Phase 3: Analytics Router"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from .. import schemas
from ..dependencies import get_db
from ..services import analytics_service

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/summary", response_model=schemas.AnalyticsSummary)
def get_analytics_summary(
    date_from: Optional[str] = Query(None, description="ISO date string, e.g. 2026-03-01"),
    date_to: Optional[str] = Query(None, description="ISO date string, e.g. 2026-03-31"),
    area: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    return analytics_service.get_analytics_summary(db, date_from=date_from, date_to=date_to, area=area)
