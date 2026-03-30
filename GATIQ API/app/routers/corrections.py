"""Phase 3: Correction Feedback Router"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from .. import schemas
from ..dependencies import get_api_key, get_db
from ..services import correction_service

router = APIRouter(prefix="/corrections", tags=["Correction Feedback"])


@router.get("", response_model=List[schemas.CorrectionFeedbackResponse], dependencies=[Depends(get_api_key)])
def list_corrections(skip: int = 0, limit: int = 200, db: Session = Depends(get_db)):
    return correction_service.get_correction_feedback(db, skip=skip, limit=limit)
