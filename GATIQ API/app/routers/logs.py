from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..dependencies import get_api_key, get_db
from ..services.log_service import create_vehicle_log

router = APIRouter(prefix="/logs", tags=["logs"])


@router.post("/entry", response_model=schemas.VehicleLogResponse, dependencies=[Depends(get_api_key)])
def create_entry(entry: schemas.VehicleLogCreate, db: Session = Depends(get_db)):
    return create_vehicle_log(entry, db)


@router.get("/history", response_model=List[schemas.VehicleLogResponse], dependencies=[Depends(get_api_key)])
def get_history(area: Optional[str] = None, skip: int = 0, limit: int = 500, db: Session = Depends(get_db)):
    query = db.query(models.VehicleLog)
    if area:
        query = query.filter(models.VehicleLog.area == area)
    return query.order_by(models.VehicleLog.id.desc()).offset(skip).limit(limit).all()


@router.delete("/{log_id}", response_model=schemas.SuccessStatus, dependencies=[Depends(get_api_key)])
def delete_log(log_id: int, db: Session = Depends(get_db)):
    log = db.query(models.VehicleLog).filter(models.VehicleLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    db.delete(log)
    db.commit()
    return {"success": True, "message": "Log entry deleted successfully"}
