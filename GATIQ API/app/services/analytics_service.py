"""
Phase 3: Analytics Service
Provides monthly/daily analytics: occupancy, visit frequency, overstay trends,
repeat offenders, whitelist utilization, manual correction rate.
"""
import datetime
import json
from typing import Optional

from sqlalchemy import func, distinct, case, and_
from sqlalchemy.orm import Session

from .. import models, schemas


def _parse_date(date_str: Optional[str]) -> Optional[datetime.datetime]:
    if not date_str:
        return None
    try:
        return datetime.datetime.fromisoformat(date_str)
    except (ValueError, TypeError):
        return None


def get_analytics_summary(
    db: Session,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    area: Optional[str] = None,
) -> schemas.AnalyticsSummary:
    """Build a comprehensive analytics summary over a time range."""

    dt_from = _parse_date(date_from) or datetime.datetime.utcnow().replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    )
    dt_to = _parse_date(date_to) or datetime.datetime.utcnow()

    # Base log query
    log_q = db.query(models.VehicleLog).filter(
        models.VehicleLog.created_at >= dt_from,
        models.VehicleLog.created_at <= dt_to,
    )
    if area:
        log_q = log_q.filter(models.VehicleLog.area == area)

    all_logs = log_q.all()

    total_entries = sum(1 for l in all_logs if (l.entry_exit or "").lower() in ("entry", "in"))
    total_exits = sum(1 for l in all_logs if (l.entry_exit or "").lower() in ("exit", "out"))
    unique_vehicles = len(set(l.vehicle_no for l in all_logs if l.vehicle_no))

    # Visit-based analytics
    visit_q = db.query(models.VehicleVisit).filter(
        models.VehicleVisit.created_at >= dt_from,
        models.VehicleVisit.created_at <= dt_to,
    )
    if area:
        visit_q = visit_q.filter(models.VehicleVisit.area == area)

    visits = visit_q.all()
    durations = [v.stay_duration_minutes for v in visits if v.stay_duration_minutes and v.stay_duration_minutes > 0]
    avg_stay = round(sum(durations) / len(durations), 1) if durations else None

    # Overstays (>480 minutes = 8 hours default threshold)
    overstay_count = sum(1 for d in durations if d > 480)

    # Source type breakdown
    scan_entries = sum(1 for v in visits if (v.source_type or "") == "scan")
    manual_entries = sum(1 for v in visits if (v.source_type or "") == "manual")

    # Whitelist utilization
    whitelist_plates = set()
    try:
        wl_items = db.query(models.Whitelist.vehicle_no).all()
        whitelist_plates = set(w[0].upper() for w in wl_items if w[0])
    except Exception:
        pass
    whitelist_hits = sum(1 for l in all_logs if l.vehicle_no and l.vehicle_no.upper() in whitelist_plates)

    # Correction rate
    total_reviews = db.query(models.ScanReview).filter(
        models.ScanReview.created_at >= dt_from,
        models.ScanReview.created_at <= dt_to,
    ).count()
    corrected_reviews = db.query(models.ScanReview).filter(
        models.ScanReview.created_at >= dt_from,
        models.ScanReview.created_at <= dt_to,
        models.ScanReview.corrected_plate.isnot(None),
    ).count()
    correction_rate = round((corrected_reviews / total_reviews) * 100, 1) if total_reviews > 0 else 0.0

    # Top repeat vehicles (top 10 by visit count)
    plate_counts = {}
    for l in all_logs:
        if l.vehicle_no:
            plate_counts[l.vehicle_no] = plate_counts.get(l.vehicle_no, 0) + 1
    top_repeat = sorted(
        [{"plate": k, "count": v} for k, v in plate_counts.items() if v > 1],
        key=lambda x: x["count"],
        reverse=True
    )[:10]

    # Daily breakdown
    day_counts = {}
    for l in all_logs:
        if l.created_at:
            day_key = l.created_at.strftime("%Y-%m-%d")
            if day_key not in day_counts:
                day_counts[day_key] = {"date": day_key, "entries": 0, "exits": 0}
            if (l.entry_exit or "").lower() in ("entry", "in"):
                day_counts[day_key]["entries"] += 1
            else:
                day_counts[day_key]["exits"] += 1
    daily_breakdown = sorted(day_counts.values(), key=lambda x: x["date"])

    return schemas.AnalyticsSummary(
        total_entries=total_entries,
        total_exits=total_exits,
        unique_vehicles=unique_vehicles,
        avg_stay_minutes=avg_stay,
        overstay_count=overstay_count,
        manual_entries=manual_entries,
        scan_entries=scan_entries,
        whitelist_hits=whitelist_hits,
        correction_rate=correction_rate,
        top_repeat_vehicles=top_repeat,
        daily_breakdown=daily_breakdown,
    )
