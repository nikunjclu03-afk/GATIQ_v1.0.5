"""Phase 1: Vehicle Search & Timeline Router"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import schemas
from ..dependencies import get_api_key, get_db
from ..services.vehicle_service import get_vehicle_timeline, search_vehicles

router = APIRouter(prefix="/vehicles", tags=["vehicles"])


@router.get("/search", response_model=List[schemas.VehicleSearchResult], dependencies=[Depends(get_api_key)])
def vehicle_search(
    q: str = "",
    limit: int = 20,
    db: Session = Depends(get_db),
):
    if not q or len(q) < 2:
        raise HTTPException(status_code=400, detail="Search query must be at least 2 characters")
    return search_vehicles(db, query=q, limit=limit)


@router.get("/{plate}/timeline", response_model=schemas.VehicleTimelineSummary, dependencies=[Depends(get_api_key)])
def vehicle_timeline(plate: str, db: Session = Depends(get_db)):
    return get_vehicle_timeline(db, plate)
