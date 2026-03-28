import datetime
import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from .. import models
from .event_service import record_event

SYNC_STATUS_PENDING = "pending"
SYNC_STATUS_SYNCED = "synced"
SYNC_STATUS_RETRYING = "retrying"
SYNC_STATUS_FAILED = "failed"
SYNC_STATUS_RUNNING = "running"
SYNC_BATCH_LIMIT = 25
LOCK_TIMEOUT_SECONDS = 60


def _utcnow():
    return datetime.datetime.utcnow()


def _dumps(payload: Dict[str, Any]) -> str:
    return json.dumps(payload, default=str)


def _loads(payload_json: str) -> Dict[str, Any]:
    return json.loads(payload_json)


def _sync_file_path() -> Path:
    data_dir = Path(os.getenv("GATIQ_DATA_DIR", Path(__file__).resolve().parents[1] / "data"))
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir / "sync_mirror.json"


def _load_mirror() -> Dict[str, Any]:
    path = _sync_file_path()
    if not path.exists():
        return {"version": 1, "vehicle_logs": [], "reports": [], "updated_at": None}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {"version": 1, "vehicle_logs": [], "reports": [], "updated_at": None}


def _save_mirror(data: Dict[str, Any]) -> None:
    data["updated_at"] = _utcnow().isoformat()
    _sync_file_path().write_text(json.dumps(data, default=str, indent=2), encoding="utf-8")


def _upsert_collection(records: List[Dict[str, Any]], item: Dict[str, Any], key: str = "id") -> None:
    item_id = str(item.get(key))
    for index, record in enumerate(records):
        if str(record.get(key)) == item_id:
            records[index] = item
            return
    records.append(item)


def enqueue_outbox_item(
    db: Session,
    *,
    aggregate_type: str,
    aggregate_id: str,
    payload: Dict[str, Any],
    operation: str = "upsert",
    dedupe_key: Optional[str] = None,
    max_attempts: int = 5,
) -> models.SyncOutbox:
    normalized_dedupe = dedupe_key or f"{aggregate_type}:{aggregate_id}:{operation}"
    existing = (
        db.query(models.SyncOutbox)
        .filter(
            models.SyncOutbox.dedupe_key == normalized_dedupe,
            models.SyncOutbox.status.in_(
                [SYNC_STATUS_PENDING, SYNC_STATUS_RETRYING, SYNC_STATUS_RUNNING, SYNC_STATUS_FAILED]
            ),
        )
        .order_by(models.SyncOutbox.id.desc())
        .first()
    )
    if existing:
        existing.payload_json = _dumps(payload)
        existing.status = SYNC_STATUS_PENDING
        existing.next_attempt_at = _utcnow()
        existing.last_error = None
        existing.locked_at = None
        db.commit()
        db.refresh(existing)
        return existing

    item = models.SyncOutbox(
        aggregate_type=aggregate_type,
        aggregate_id=aggregate_id,
        operation=operation,
        status=SYNC_STATUS_PENDING,
        payload_json=_dumps(payload),
        dedupe_key=normalized_dedupe,
        max_attempts=max_attempts,
        next_attempt_at=_utcnow(),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def enqueue_vehicle_log_sync(db: Session, log: models.VehicleLog) -> models.SyncOutbox:
    payload = {
        "id": log.id,
        "site_id": log.site_id,
        "gate_id": log.gate_id,
        "device_id": log.device_id,
        "user_id": log.user_id,
        "vehicle_no": log.vehicle_no,
        "vehicle_type": log.vehicle_type,
        "gate_no": log.gate_no,
        "area": log.area,
        "entry_exit": log.entry_exit,
        "purpose": log.purpose,
        "tagging": log.tagging,
        "vehicle_capacity": log.vehicle_capacity,
        "dock_no": log.dock_no,
        "consignment_no": log.consignment_no,
        "driver_name": log.driver_name,
        "driver_phone": log.driver_phone,
        "status": log.status,
        "timestamp": log.timestamp.isoformat() if log.timestamp else None,
    }
    item = enqueue_outbox_item(
        db,
        aggregate_type="vehicle_log",
        aggregate_id=str(log.id),
        payload=payload,
        dedupe_key=f"vehicle_log:{log.id}:upsert",
    )
    log.is_synced = False
    db.commit()
    record_event(
        db,
        event_type="sync_item_enqueued",
        aggregate_type="vehicle_log",
        aggregate_id=str(log.id),
        payload={"outbox_id": item.id},
    )
    return item


def enqueue_report_sync(db: Session, report: models.PDFReport) -> models.SyncOutbox:
    payload = {
        "id": report.id,
        "site_id": report.site_id,
        "gate_id": report.gate_id,
        "device_id": report.device_id,
        "user_id": report.user_id,
        "name": report.name,
        "area": report.area,
        "timestamp": report.timestamp.isoformat() if report.timestamp else None,
        "entry_count": report.entry_count,
    }
    item = enqueue_outbox_item(
        db,
        aggregate_type="report",
        aggregate_id=str(report.id),
        payload=payload,
        dedupe_key=f"report:{report.id}:upsert",
    )
    report.synced_at = None
    db.commit()
    record_event(
        db,
        event_type="sync_item_enqueued",
        aggregate_type="report",
        aggregate_id=str(report.id),
        payload={"outbox_id": item.id},
    )
    return item


def claim_sync_batch(db: Session, *, area: Optional[str] = None, limit: int = SYNC_BATCH_LIMIT) -> List[models.SyncOutbox]:
    now = _utcnow()
    lock_cutoff = now - datetime.timedelta(seconds=LOCK_TIMEOUT_SECONDS)
    query = db.query(models.SyncOutbox).filter(
        models.SyncOutbox.status.in_([SYNC_STATUS_PENDING, SYNC_STATUS_RETRYING]),
        models.SyncOutbox.next_attempt_at <= now,
        or_(models.SyncOutbox.locked_at.is_(None), models.SyncOutbox.locked_at < lock_cutoff),
    )
    if area:
        query = query.filter(models.SyncOutbox.payload_json.like(f'%\"area\": \"{area}\"%'))
    items = query.order_by(models.SyncOutbox.created_at.asc()).limit(limit).all()
    for item in items:
        item.status = SYNC_STATUS_RUNNING
        item.locked_at = now
        item.last_attempt_at = now
        item.attempt_count += 1
    db.commit()
    for item in items:
        db.refresh(item)
    return items


def _apply_item_to_mirror(mirror: Dict[str, Any], item: models.SyncOutbox) -> None:
    payload = _loads(item.payload_json)
    if item.aggregate_type == "vehicle_log":
        _upsert_collection(mirror["vehicle_logs"], payload)
    elif item.aggregate_type == "report":
        _upsert_collection(mirror["reports"], payload)
    else:
        raise RuntimeError(f"Unsupported sync aggregate type: {item.aggregate_type}")


def process_sync_batch(db: Session, *, job_id: str, correlation_id: str, area: Optional[str] = None) -> Dict[str, Any]:
    items = claim_sync_batch(db, area=area)
    if not items:
        return {"synced_count": 0, "failed_count": 0, "pending_count": get_sync_stats(db)["pending_sync_records"], "area": area}

    mirror = _load_mirror()
    synced_count = 0
    failed_count = 0
    failures: List[Dict[str, Any]] = []

    for item in items:
        try:
            _apply_item_to_mirror(mirror, item)
            item.status = SYNC_STATUS_SYNCED
            item.synced_at = _utcnow()
            item.locked_at = None
            item.last_error = None
            synced_count += 1

            if item.aggregate_type == "vehicle_log":
                log = db.query(models.VehicleLog).filter(models.VehicleLog.id == int(item.aggregate_id)).first()
                if log:
                    log.is_synced = True
            elif item.aggregate_type == "report":
                report = db.query(models.PDFReport).filter(models.PDFReport.id == item.aggregate_id).first()
                if report:
                    report.synced_at = item.synced_at

            record_event(
                db,
                event_type="sync_item_synced",
                aggregate_type=item.aggregate_type,
                aggregate_id=item.aggregate_id,
                job_id=job_id,
                correlation_id=correlation_id,
                payload={"outbox_id": item.id},
            )
            sync_run_id = None
            if job_id != "legacy-sync":
                sync_run = db.query(models.SyncRun).filter(models.SyncRun.job_id == job_id).first()
                sync_run_id = sync_run.id if sync_run else None
            db.add(
                models.SyncEvent(
                    sync_run_id=sync_run_id,
                    outbox_id=item.id,
                    aggregate_type=item.aggregate_type,
                    aggregate_id=item.aggregate_id,
                    event_type="synced",
                    payload_json=_dumps({"job_id": job_id}),
                )
            )
        except Exception as exc:
            item.locked_at = None
            item.last_error = str(exc)
            backoff_seconds = min(300, 2 ** max(item.attempt_count, 1))
            item.next_attempt_at = _utcnow() + datetime.timedelta(seconds=backoff_seconds)
            if item.attempt_count >= item.max_attempts:
                item.status = SYNC_STATUS_FAILED
            else:
                item.status = SYNC_STATUS_RETRYING
            failed_count += 1
            failures.append({"outbox_id": item.id, "aggregate_type": item.aggregate_type, "error": str(exc)})
            record_event(
                db,
                event_type="sync_item_failed" if item.status == SYNC_STATUS_FAILED else "sync_item_retrying",
                aggregate_type=item.aggregate_type,
                aggregate_id=item.aggregate_id,
                job_id=job_id,
                correlation_id=correlation_id,
                payload={"outbox_id": item.id, "error": str(exc), "attempt_count": item.attempt_count},
            )
            sync_run_id = None
            if job_id != "legacy-sync":
                sync_run = db.query(models.SyncRun).filter(models.SyncRun.job_id == job_id).first()
                sync_run_id = sync_run.id if sync_run else None
            db.add(
                models.SyncEvent(
                    sync_run_id=sync_run_id,
                    outbox_id=item.id,
                    aggregate_type=item.aggregate_type,
                    aggregate_id=item.aggregate_id,
                    event_type="failed" if item.status == SYNC_STATUS_FAILED else "retrying",
                    payload_json=_dumps({"job_id": job_id, "error": str(exc)}),
                )
            )

    _save_mirror(mirror)
    db.commit()
    stats = get_sync_stats(db)
    return {
        "synced_count": synced_count,
        "failed_count": failed_count,
        "pending_count": stats["pending_sync_records"],
        "failed_records": stats["failed_sync_records"],
        "area": area,
        "failures": failures,
    }


def get_sync_stats(db: Session) -> Dict[str, Any]:
    last_synced_row = (
        db.query(models.SyncOutbox)
        .filter(models.SyncOutbox.synced_at.isnot(None))
        .order_by(models.SyncOutbox.synced_at.desc())
        .with_entities(models.SyncOutbox.synced_at)
        .first()
    )
    return {
        "pending_sync_records": db.query(models.SyncOutbox).filter(
            models.SyncOutbox.status.in_([SYNC_STATUS_PENDING, SYNC_STATUS_RETRYING, SYNC_STATUS_RUNNING])
        ).count(),
        "failed_sync_records": db.query(models.SyncOutbox).filter(
            models.SyncOutbox.status == SYNC_STATUS_FAILED
        ).count(),
        "last_synced_at": last_synced_row[0].isoformat() if last_synced_row and last_synced_row[0] else None,
    }
