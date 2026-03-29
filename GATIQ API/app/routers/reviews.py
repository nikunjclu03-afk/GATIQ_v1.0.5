"""Phase 1: Scan Review Queue Router"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import schemas
from ..dependencies import get_api_key, get_db
from ..services.review_service import (
    confirm_review,
    get_review,
    list_reviews,
    mark_unreadable,
    reject_review,
)

router = APIRouter(prefix="/scan/reviews", tags=["reviews"])


@router.get("", response_model=List[schemas.ScanReviewResponse], dependencies=[Depends(get_api_key)])
def read_reviews(
    status: Optional[str] = None,
    area: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    return list_reviews(db, status=status, area=area, skip=skip, limit=limit)


@router.get("/{review_id}", response_model=schemas.ScanReviewResponse, dependencies=[Depends(get_api_key)])
def read_review(review_id: int, db: Session = Depends(get_db)):
    review = get_review(db, review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review


@router.post("/{review_id}/confirm", response_model=schemas.ScanReviewResponse, dependencies=[Depends(get_api_key)])
def confirm_scan_review(
    review_id: int,
    request: schemas.ReviewConfirmRequest = schemas.ReviewConfirmRequest(),
    db: Session = Depends(get_db),
):
    try:
        return confirm_review(db, review_id, request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{review_id}/reject", response_model=schemas.ScanReviewResponse, dependencies=[Depends(get_api_key)])
def reject_scan_review(
    review_id: int,
    request: schemas.ReviewRejectRequest = schemas.ReviewRejectRequest(),
    db: Session = Depends(get_db),
):
    try:
        return reject_review(db, review_id, request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{review_id}/unreadable", response_model=schemas.ScanReviewResponse, dependencies=[Depends(get_api_key)])
def mark_scan_unreadable(
    review_id: int,
    request: schemas.ReviewRejectRequest = schemas.ReviewRejectRequest(),
    db: Session = Depends(get_db),
):
    try:
        return mark_unreadable(db, review_id, request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
