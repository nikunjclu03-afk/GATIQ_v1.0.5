"""Phase 1: Exception Dashboard Router"""
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import schemas
from ..dependencies import get_api_key, get_db
from ..services.exception_service import get_exception_summary

router = APIRouter(prefix="/exceptions", tags=["exceptions"])


@router.get("/summary", response_model=schemas.ExceptionSummary, dependencies=[Depends(get_api_key)])
def read_exception_summary(
    area: Optional[str] = None,
    overstay_threshold_minutes: int = 480,
    db: Session = Depends(get_db),
):
    return get_exception_summary(db, area=area, overstay_threshold_minutes=overstay_threshold_minutes)
