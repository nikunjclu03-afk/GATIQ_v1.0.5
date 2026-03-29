"""Phase 1: Camera Health Monitor Router"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import schemas
from ..dependencies import get_api_key, get_db
from ..services.camera_service import (
    get_camera,
    list_cameras,
    restart_camera,
    upsert_camera_health,
)

router = APIRouter(prefix="/camera", tags=["camera"])


@router.get("/health", response_model=List[schemas.CameraHealthResponse], dependencies=[Depends(get_api_key)])
def read_all_cameras(db: Session = Depends(get_db)):
    return list_cameras(db)


@router.get("/health/{source_id:path}", response_model=schemas.CameraHealthResponse, dependencies=[Depends(get_api_key)])
def read_camera_health(source_id: str, db: Session = Depends(get_db)):
    camera = get_camera(db, source_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    return camera


@router.put("/health", response_model=schemas.CameraHealthResponse, dependencies=[Depends(get_api_key)])
def update_camera_health(update: schemas.CameraHealthUpdate, db: Session = Depends(get_db)):
    camera = upsert_camera_health(db, update)
    return schemas.CameraHealthResponse(
        id=camera.id,
        source_id=camera.source_id,
        source_type=camera.source_type,
        label=camera.label,
        is_online=camera.is_online,
        last_success_at=camera.last_success_at,
        last_frame_at=camera.last_frame_at,
        last_error=camera.last_error,
        restart_supported=camera.restart_supported,
        consecutive_failures=camera.consecutive_failures,
    )


@router.post("/restart/{source_id:path}", dependencies=[Depends(get_api_key)])
def restart_camera_endpoint(source_id: str, db: Session = Depends(get_db)):
    return restart_camera(db, source_id)
