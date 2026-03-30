"""
Phase 3: Report Export Service
Generates CSV exports of vehicle logs with filters.
"""
import csv
import io
import json
import datetime
import os
from typing import Optional

from sqlalchemy.orm import Session

from .. import models, schemas


def _parse_date(date_str: Optional[str]) -> Optional[datetime.datetime]:
    if not date_str:
        return None
    try:
        return datetime.datetime.fromisoformat(date_str)
    except (ValueError, TypeError):
        return None


def create_csv_export(
    db: Session,
    request: schemas.ReportExportRequest,
) -> models.ReportExportJob:
    """Create a CSV export job and generate the file synchronously."""

    filters = {
        "date_from": request.date_from,
        "date_to": request.date_to,
        "area": request.area,
        "gate_no": request.gate_no,
        "direction": request.direction,
    }

    job = models.ReportExportJob(
        export_type=request.export_type or "csv",
        filters_json=json.dumps(filters),
        status="processing",
        operator_id=request.operator_id,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    try:
        # Build query
        query = db.query(models.VehicleLog)

        dt_from = _parse_date(request.date_from)
        dt_to = _parse_date(request.date_to)
        if dt_from:
            query = query.filter(models.VehicleLog.created_at >= dt_from)
        if dt_to:
            query = query.filter(models.VehicleLog.created_at <= dt_to)
        if request.area:
            query = query.filter(models.VehicleLog.area == request.area)
        if request.gate_no:
            query = query.filter(models.VehicleLog.gate_no == request.gate_no)
        if request.direction:
            query = query.filter(models.VehicleLog.entry_exit == request.direction)

        logs = query.order_by(models.VehicleLog.created_at.desc()).all()

        # Generate CSV content
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Sr No", "Vehicle No", "Vehicle Type", "Gate No", "Area",
            "Entry/Exit", "Purpose", "Tagging", "Driver Name",
            "Driver Phone", "Status", "Date/Time"
        ])

        for idx, log in enumerate(logs, 1):
            writer.writerow([
                idx,
                log.vehicle_no or "",
                log.vehicle_type or "",
                log.gate_no or "",
                log.area or "",
                log.entry_exit or "",
                log.purpose or "",
                log.tagging or "",
                log.driver_name or "",
                log.driver_phone or "",
                log.status or "",
                log.created_at.strftime("%Y-%m-%d %H:%M:%S") if log.created_at else "",
            ])

        # Save to exports directory
        export_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "exports")
        os.makedirs(export_dir, exist_ok=True)

        filename = f"gatiq_export_{job.id}_{datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
        filepath = os.path.join(export_dir, filename)

        with open(filepath, "w", newline="", encoding="utf-8-sig") as f:
            f.write(output.getvalue())

        job.status = "completed"
        job.result_path = filepath
        job.total_rows = len(logs)
        job.completed_at = datetime.datetime.utcnow()

    except Exception as e:
        job.status = "failed"
        job.result_path = str(e)

    db.commit()
    db.refresh(job)
    return job


def get_export_jobs(db: Session, skip: int = 0, limit: int = 50):
    return db.query(models.ReportExportJob).order_by(
        models.ReportExportJob.created_at.desc()
    ).offset(skip).limit(limit).all()
