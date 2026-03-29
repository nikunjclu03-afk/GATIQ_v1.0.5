"""
Phase 1: Vehicle Service
Handles duplicate detection, vehicle timeline/history, visit tracking (entry-exit pairing).
"""
import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas


def _utcnow():
    return datetime.datetime.utcnow()


def normalize_plate(plate: str) -> str:
    """Normalize plate for comparison: strip spaces, uppercase."""
    return "".join(c for c in (plate or "").upper() if c.isalnum())


def check_duplicate_flags(
    db: Session,
    plate: str,
    *,
    site_id: Optional[int] = None,
    cooldown_minutes: int = 30,
) -> Optional[Dict[str, Any]]:
    """Check if a vehicle is already inside or has been recently scanned."""
    if not plate or plate == "UNREADABLE":
        return None

    normalized = normalize_plate(plate)
    cutoff = _utcnow() - datetime.timedelta(minutes=cooldown_minutes)

    # Check open visits (vehicle is currently inside)
    open_visit_query = db.query(models.VehicleVisit).filter(
        models.VehicleVisit.normalized_plate == normalized,
        models.VehicleVisit.is_open == True,
    )
    if site_id:
        open_visit_query = open_visit_query.filter(models.VehicleVisit.site_id == site_id)
    open_visit = open_visit_query.order_by(models.VehicleVisit.entry_at.desc()).first()

    # Check recent logs for duplicate
    recent_log = (
        db.query(models.VehicleLog)
        .filter(
            models.VehicleLog.vehicle_no == normalized,
            models.VehicleLog.timestamp >= cutoff,
        )
        .order_by(models.VehicleLog.timestamp.desc())
        .first()
    )

    # Also check recent reviews
    recent_review = (
        db.query(models.ScanReview)
        .filter(
            models.ScanReview.detected_plate == normalized,
            models.ScanReview.created_at >= cutoff,
            models.ScanReview.status == "pending_review",
        )
        .first()
    )

    flags = {
        "already_inside": open_visit is not None,
        "recent_duplicate": recent_log is not None,
        "repeat_scan_suspected": recent_review is not None,
        "existing_visit_id": open_visit.id if open_visit else None,
        "last_entry_at": open_visit.entry_at.isoformat() if open_visit and open_visit.entry_at else None,
    }

    # Return None if no flags are set
    if not flags["already_inside"] and not flags["recent_duplicate"] and not flags["repeat_scan_suspected"]:
        return None

    return flags


def record_visit_entry(
    db: Session,
    *,
    log: models.VehicleLog,
    source_type: str = "scan",
    review_status: Optional[str] = None,
) -> models.VehicleVisit:
    """Record a visit entry (or exit, closing an existing visit)."""
    normalized = normalize_plate(log.vehicle_no)
    direction = (log.entry_exit or "Entry").strip().lower()

    if direction in ("exit", "left", "exited", "checked out", "dispatched"):
        # Try closing an open visit for this plate
        open_visit = (
            db.query(models.VehicleVisit)
            .filter(
                models.VehicleVisit.normalized_plate == normalized,
                models.VehicleVisit.is_open == True,
            )
            .order_by(models.VehicleVisit.entry_at.desc())
            .first()
        )
        if open_visit:
            open_visit.exit_log_id = log.id
            open_visit.exit_at = log.timestamp or _utcnow()
            open_visit.is_open = False
            if open_visit.entry_at:
                delta = (open_visit.exit_at - open_visit.entry_at).total_seconds()
                open_visit.stay_duration_minutes = int(delta / 60)
            db.commit()
            db.refresh(open_visit)
            return open_visit

    # Create new visit entry
    visit = models.VehicleVisit(
        site_id=log.site_id,
        normalized_plate=normalized,
        entry_log_id=log.id,
        entry_at=log.timestamp or _utcnow(),
        is_open=True,
        area=log.area,
        gate_no=log.gate_no,
        vehicle_type=log.vehicle_type,
        tagging=log.tagging,
        source_type=source_type,
        review_status=review_status,
    )
    db.add(visit)
    db.commit()
    db.refresh(visit)
    return visit


def search_vehicles(
    db: Session,
    *,
    query: str,
    limit: int = 20,
) -> List[schemas.VehicleSearchResult]:
    """Search vehicles by plate number (partial match)."""
    search_term = normalize_plate(query)
    if not search_term:
        return []

    # Find unique plates that match
    results = (
        db.query(
            models.VehicleVisit.normalized_plate,
            func.count(models.VehicleVisit.id).label("total_visits"),
            func.max(models.VehicleVisit.entry_at).label("last_seen"),
            func.sum(
                func.cast(models.VehicleVisit.is_open, models.Integer)
            ).label("open_count"),
        )
        .filter(models.VehicleVisit.normalized_plate.like(f"%{search_term}%"))
        .group_by(models.VehicleVisit.normalized_plate)
        .order_by(func.max(models.VehicleVisit.entry_at).desc())
        .limit(limit)
        .all()
    )

    return [
        schemas.VehicleSearchResult(
            plate=r.normalized_plate,
            total_visits=r.total_visits,
            last_seen=r.last_seen.isoformat() if r.last_seen else None,
            current_status="inside" if (r.open_count or 0) > 0 else "outside",
        )
        for r in results
    ]


def get_vehicle_timeline(
    db: Session,
    plate: str,
) -> schemas.VehicleTimelineSummary:
    """Get full visit timeline for a specific plate."""
    normalized = normalize_plate(plate)

    visits = (
        db.query(models.VehicleVisit)
        .filter(models.VehicleVisit.normalized_plate == normalized)
        .order_by(models.VehicleVisit.entry_at.desc())
        .limit(100)
        .all()
    )

    total_visits = len(visits)
    open_visits = sum(1 for v in visits if v.is_open)
    completed = [v for v in visits if v.stay_duration_minutes is not None]
    avg_stay = sum(v.stay_duration_minutes for v in completed) / len(completed) if completed else None

    last_entry = visits[0].entry_at if visits else None
    last_exit = None
    for v in visits:
        if v.exit_at:
            last_exit = v.exit_at
            break

    visit_data = [
        {
            "id": v.id,
            "entry_at": v.entry_at.isoformat() if v.entry_at else None,
            "exit_at": v.exit_at.isoformat() if v.exit_at else None,
            "is_open": v.is_open,
            "stay_duration_minutes": v.stay_duration_minutes,
            "area": v.area,
            "gate_no": v.gate_no,
            "vehicle_type": v.vehicle_type,
            "tagging": v.tagging,
            "source_type": v.source_type,
            "review_status": v.review_status,
        }
        for v in visits
    ]

    return schemas.VehicleTimelineSummary(
        normalized_plate=normalized,
        total_visits=total_visits,
        open_visits=open_visits,
        last_entry_at=last_entry.isoformat() if last_entry else None,
        last_exit_at=last_exit.isoformat() if last_exit else None,
        avg_stay_duration_minutes=round(avg_stay, 1) if avg_stay else None,
        visits=visit_data,
    )
