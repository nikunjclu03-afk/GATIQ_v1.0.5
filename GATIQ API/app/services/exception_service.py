"""
Phase 1: Exception Dashboard Service
Aggregates counts for exception dashboard cards.
"""
import datetime
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas


def _utcnow():
    return datetime.datetime.utcnow()


def get_exception_summary(
    db: Session,
    *,
    area: Optional[str] = None,
    overstay_threshold_minutes: int = 480,  # 8 hours default
) -> schemas.ExceptionSummary:
    """Calculate exception dashboard summary cards."""

    # 1. Unreadable scans (reviews marked as unreadable)
    unreadable_query = db.query(func.count(models.ScanReview.id)).filter(
        models.ScanReview.status == "unreadable"
    )
    if area:
        unreadable_query = unreadable_query.filter(models.ScanReview.area == area)
    unreadable_scans = unreadable_query.scalar() or 0

    # 2. Pending reviews
    pending_query = db.query(func.count(models.ScanReview.id)).filter(
        models.ScanReview.status == "pending_review"
    )
    if area:
        pending_query = pending_query.filter(models.ScanReview.area == area)
    pending_reviews = pending_query.scalar() or 0

    # 3. Pending exits (open visits)
    pending_exit_query = db.query(func.count(models.VehicleVisit.id)).filter(
        models.VehicleVisit.is_open == True
    )
    if area:
        pending_exit_query = pending_exit_query.filter(models.VehicleVisit.area == area)
    pending_exits = pending_exit_query.scalar() or 0

    # 4. Overstay vehicles (open visits exceeding threshold)
    overstay_cutoff = _utcnow() - datetime.timedelta(minutes=overstay_threshold_minutes)
    overstay_query = db.query(func.count(models.VehicleVisit.id)).filter(
        models.VehicleVisit.is_open == True,
        models.VehicleVisit.entry_at <= overstay_cutoff,
    )
    if area:
        overstay_query = overstay_query.filter(models.VehicleVisit.area == area)
    overstay_vehicles = overstay_query.scalar() or 0

    # 5. Manual entries (logs without a linked scan job — source_type is manual or null)
    manual_query = db.query(func.count(models.VehicleVisit.id)).filter(
        models.VehicleVisit.source_type == "manual"
    )
    if area:
        manual_query = manual_query.filter(models.VehicleVisit.area == area)
    manual_entries = manual_query.scalar() or 0

    # 6. Scan failures (failed scan jobs)
    scan_failures = (
        db.query(func.count(models.JobQueue.job_id))
        .filter(
            models.JobQueue.job_type == "scan",
            models.JobQueue.status == "failed",
        )
        .scalar()
        or 0
    )

    # 7. Backend failures (all failed jobs)
    backend_failures = (
        db.query(func.count(models.JobQueue.job_id))
        .filter(models.JobQueue.status == "failed")
        .scalar()
        or 0
    )

    return schemas.ExceptionSummary(
        unreadable_scans=unreadable_scans,
        pending_reviews=pending_reviews,
        pending_exits=pending_exits,
        overstay_vehicles=overstay_vehicles,
        manual_entries=manual_entries,
        scan_failures=scan_failures,
        backend_failures=backend_failures,
    )
