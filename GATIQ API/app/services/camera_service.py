"""
Phase 1: Camera Health Monitor Service
Tracks camera online/offline status, last frame timestamps, and error history.
"""
import datetime
from typing import List, Optional

from sqlalchemy.orm import Session

from .. import models, schemas
from .event_service import record_event


def _utcnow():
    return datetime.datetime.utcnow()


def upsert_camera_health(
    db: Session,
    update: schemas.CameraHealthUpdate,
) -> models.CameraHealth:
    """Create or update a camera health record."""
    existing = (
        db.query(models.CameraHealth)
        .filter(models.CameraHealth.source_id == update.source_id)
        .first()
    )

    if existing:
        if update.label is not None:
            existing.label = update.label
        if update.site_id is not None:
            existing.site_id = update.site_id
        if update.gate_id is not None:
            existing.gate_id = update.gate_id
        if update.is_online is not None:
            existing.is_online = update.is_online
            if update.is_online:
                existing.last_success_at = _utcnow()
                existing.last_frame_at = _utcnow()
                existing.consecutive_failures = 0
                existing.last_error = None
            else:
                existing.consecutive_failures += 1
        if update.last_error is not None:
            existing.last_error = update.last_error
        db.commit()
        db.refresh(existing)
        return existing

    camera = models.CameraHealth(
        source_id=update.source_id,
        source_type=update.source_type,
        label=update.label,
        site_id=update.site_id,
        gate_id=update.gate_id,
        is_online=update.is_online or False,
        last_success_at=_utcnow() if update.is_online else None,
        last_frame_at=_utcnow() if update.is_online else None,
        last_error=update.last_error,
    )
    db.add(camera)
    db.commit()
    db.refresh(camera)
    return camera


def record_camera_success(
    db: Session,
    source_id: str,
) -> None:
    """Record a successful frame capture."""
    camera = db.query(models.CameraHealth).filter(models.CameraHealth.source_id == source_id).first()
    if camera:
        camera.is_online = True
        camera.last_success_at = _utcnow()
        camera.last_frame_at = _utcnow()
        camera.consecutive_failures = 0
        camera.last_error = None
        db.commit()


def record_camera_failure(
    db: Session,
    source_id: str,
    error: str,
) -> None:
    """Record a camera failure."""
    camera = db.query(models.CameraHealth).filter(models.CameraHealth.source_id == source_id).first()
    if camera:
        camera.is_online = False
        camera.consecutive_failures += 1
        camera.last_error = error
        db.commit()
    else:
        # Auto-register camera on first failure
        upsert_camera_health(
            db,
            schemas.CameraHealthUpdate(
                source_id=source_id,
                is_online=False,
                last_error=error,
            ),
        )


def list_cameras(db: Session) -> List[schemas.CameraHealthResponse]:
    """List all registered cameras with their health status."""
    cameras = db.query(models.CameraHealth).order_by(models.CameraHealth.id.asc()).all()
    return [
        schemas.CameraHealthResponse(
            id=c.id,
            source_id=c.source_id,
            source_type=c.source_type,
            label=c.label,
            is_online=c.is_online,
            last_success_at=c.last_success_at,
            last_frame_at=c.last_frame_at,
            last_error=c.last_error,
            restart_supported=c.restart_supported,
            consecutive_failures=c.consecutive_failures,
        )
        for c in cameras
    ]


def get_camera(db: Session, source_id: str) -> Optional[schemas.CameraHealthResponse]:
    """Get a single camera's health status."""
    camera = db.query(models.CameraHealth).filter(models.CameraHealth.source_id == source_id).first()
    if not camera:
        return None
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


def restart_camera(db: Session, source_id: str) -> dict:
    """Attempt to restart a camera (reset health state for retry)."""
    camera = db.query(models.CameraHealth).filter(models.CameraHealth.source_id == source_id).first()
    if not camera:
        return {"success": False, "message": "Camera not found"}

    camera.consecutive_failures = 0
    camera.last_error = None
    camera.is_online = False  # Will be set to True on next successful frame
    db.commit()

    record_event(
        db,
        event_type="camera_restart_requested",
        aggregate_type="camera",
        aggregate_id=source_id,
        payload={"source_id": source_id, "label": camera.label},
    )

    return {"success": True, "message": f"Camera {camera.label or source_id} reset for retry"}
