import datetime
import hashlib
import json
import threading
import time
import uuid
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from .. import database, models, schemas
from . import ai_runtime, log_service, report_service, review_service, sync_service
from .event_service import list_job_events, record_event
from .normalization_service import get_or_create_device, get_or_create_gate, get_or_create_site, get_or_create_user

JOB_STATUS_QUEUED = "queued"
JOB_STATUS_RUNNING = "running"
JOB_STATUS_SUCCEEDED = "succeeded"
JOB_STATUS_FAILED = "failed"
JOB_STATUS_RETRYING = "retrying"
JOB_STATUS_CANCELLED = "cancelled"
ACTIVE_JOB_STATUSES = {JOB_STATUS_QUEUED, JOB_STATUS_RUNNING, JOB_STATUS_RETRYING}
DEFAULT_POLL_MS = 1500
WORKER_LEASE_SECONDS = 30
WORKER_IDLE_SECONDS = 1

_worker_thread = None
_worker_stop_event = threading.Event()
_worker_started = False
_worker_lock = threading.Lock()


class RetryableJobError(Exception):
    pass


def _utcnow():
    return datetime.datetime.utcnow()


def _time_bucket(fmt: str = "%Y%m%d%H%M") -> str:
    return _utcnow().strftime(fmt)


def _dumps(payload: Optional[Dict[str, Any]]) -> Optional[str]:
    if payload is None:
        return None
    return json.dumps(payload, default=str)


def _loads(payload_json: Optional[str]) -> Optional[Dict[str, Any]]:
    if not payload_json:
        return None
    return json.loads(payload_json)


def _hash_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _model_dump(model: Any) -> Dict[str, Any]:
    if hasattr(model, "model_dump"):
        return model.model_dump()
    return model.dict()


def _serialize_job(job: models.JobQueue) -> schemas.JobStatusResponse:
    return schemas.JobStatusResponse(
        job_id=job.job_id,
        status=job.status,
        job_type=job.job_type,
        correlation_id=job.correlation_id,
        attempt_count=job.attempt_count,
        max_attempts=job.max_attempts,
        created_at=job.created_at,
        started_at=job.started_at,
        completed_at=job.completed_at,
        result=_loads(job.result_json),
        error_message=job.error_message,
    )


def _make_accept_response(job: models.JobQueue) -> schemas.JobAcceptedResponse:
    return schemas.JobAcceptedResponse(
        job_id=job.job_id,
        status=job.status,
        job_type=job.job_type,
        correlation_id=job.correlation_id,
        poll_interval_ms=DEFAULT_POLL_MS,
    )


def _job_payload(job: models.JobQueue) -> Dict[str, Any]:
    return _loads(job.payload_json) or {}


def _enqueue_job(
    db: Session,
    *,
    job_type: str,
    payload: Dict[str, Any],
    dedupe_key: str,
    priority: int = 100,
    max_attempts: int = 3,
) -> models.JobQueue:
    existing = (
        db.query(models.JobQueue)
        .filter(
            models.JobQueue.job_type == job_type,
            models.JobQueue.dedupe_key == dedupe_key,
            models.JobQueue.status.in_(
                [
                    JOB_STATUS_QUEUED,
                    JOB_STATUS_RUNNING,
                    JOB_STATUS_RETRYING,
                    JOB_STATUS_SUCCEEDED,
                ]
            ),
        )
        .order_by(models.JobQueue.created_at.desc())
        .first()
    )
    if existing:
        return existing

    job_id = str(uuid.uuid4())
    correlation_id = str(uuid.uuid4())
    job = models.JobQueue(
        job_id=job_id,
        job_type=job_type,
        status=JOB_STATUS_QUEUED,
        priority=priority,
        payload_json=_dumps(payload),
        dedupe_key=dedupe_key,
        correlation_id=correlation_id,
        max_attempts=max_attempts,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def enqueue_scan_job(
    db: Session,
    *,
    source: str,
    request: schemas.ScanJobCreate | schemas.CCTVScanJobCreate,
) -> schemas.JobAcceptedResponse:
    fingerprint_source = request.image_base64 if source == "webcam" else request.rtsp_url
    dedupe_key = _hash_text(f"{source}:{fingerprint_source}:{request.area}:{request.gate_no}:{_time_bucket()}")
    payload = {"source": source, "area": request.area, "gate_no": request.gate_no}
    job = _enqueue_job(db, job_type="scan", payload=payload, dedupe_key=dedupe_key, max_attempts=8)

    existing_scan_job = db.query(models.ScanJob).filter(models.ScanJob.job_id == job.job_id).first()
    if not existing_scan_job:
        site = db.query(models.Site).filter(models.Site.id == request.site_id).first() if request.site_id else None
        if site is None:
            site = get_or_create_site(db, area=request.area, facility_name=request.facility_name)
        gate = db.query(models.Gate).filter(models.Gate.id == request.gate_id).first() if request.gate_id else None
        if gate is None:
            gate = get_or_create_gate(db, site_id=site.id if site else None, gate_name=request.gate_no)
        user = db.query(models.AppUser).filter(models.AppUser.id == request.user_id).first() if request.user_id else None
        if user is None:
            user = get_or_create_user(db, operator_name=request.operator_name)
        device = get_or_create_device(
            db,
            site_id=site.id if site else None,
            gate_id=gate.id if gate else None,
            device_uid=request.device_id,
            label=request.gate_no,
        )
        scan_job = models.ScanJob(
            job_id=job.job_id,
            site_id=site.id if site else request.site_id,
            gate_id=gate.id if gate else request.gate_id,
            device_row_id=device.id if device else None,
            user_id=user.id if user else request.user_id,
            source=source,
            area=request.area,
            gate_no=request.gate_no,
            facility_name=request.facility_name,
            purpose=request.purpose,
            tagging=request.tagging,
            vehicle_type=request.vehicle_type,
            vehicle_capacity=request.vehicle_capacity,
            dock_no=request.dock_no,
            consignment_no=request.consignment_no,
            driver_name=request.driver_name,
            driver_phone=request.driver_phone,
            status_label=request.status,
            image_base64=getattr(request, "image_base64", None),
            rtsp_url=getattr(request, "rtsp_url", None),
            operator_name=request.operator_name,
            device_id=device.device_uid if device else request.device_id,
        )
        db.add(scan_job)
        db.commit()

    record_event(
        db,
        event_type="scan_requested",
        aggregate_type="scan_job",
        aggregate_id=job.job_id,
        job_id=job.job_id,
        correlation_id=job.correlation_id,
        payload={"source": source, "area": request.area, "gate_no": request.gate_no},
    )
    return _make_accept_response(job)


def enqueue_report_job(db: Session, request: schemas.ReportJobCreate) -> schemas.JobAcceptedResponse:
    dedupe_key = _hash_text(
        f"report:{request.id}:{request.area}:{request.gate_no or ''}:{request.entry_count}:{_time_bucket()}"
    )
    payload = {"report_id": request.id, "area": request.area, "entry_count": request.entry_count}
    job = _enqueue_job(db, job_type="report", payload=payload, dedupe_key=dedupe_key, max_attempts=3)

    existing = db.query(models.ReportJob).filter(models.ReportJob.job_id == job.job_id).first()
    if not existing:
        site = db.query(models.Site).filter(models.Site.id == request.site_id).first() if request.site_id else None
        if site is None:
            site = get_or_create_site(db, area=request.area, facility_name=request.name)
        gate = db.query(models.Gate).filter(models.Gate.id == request.gate_id).first() if request.gate_id else None
        if gate is None:
            gate = get_or_create_gate(db, site_id=site.id if site else None, gate_name=request.gate_no)
        user = db.query(models.AppUser).filter(models.AppUser.id == request.user_id).first() if request.user_id else None
        if user is None:
            user = get_or_create_user(db, operator_name="Local Operator")
        device = db.query(models.Device).filter(models.Device.id == request.device_id).first() if request.device_id else None
        if device is None:
            device = get_or_create_device(
                db,
                site_id=site.id if site else None,
                gate_id=gate.id if gate else None,
                device_uid=f"report-{site.id if site else 0}-{gate.id if gate else 0}",
                label=request.name,
            )
        db.add(
            models.ReportJob(
                job_id=job.job_id,
                site_id=site.id if site else request.site_id,
                gate_id=gate.id if gate else request.gate_id,
                device_id=device.id if device else request.device_id,
                user_id=user.id if user else request.user_id,
                report_id=request.id,
                name=request.name,
                area=request.area,
                gate_no=request.gate_no,
                timestamp=request.timestamp,
                entry_count=request.entry_count,
                snapshot_json=_dumps(request.snapshot),
            )
        )
        db.commit()

    record_event(
        db,
        event_type="report_requested",
        aggregate_type="report_job",
        aggregate_id=job.job_id,
        job_id=job.job_id,
        correlation_id=job.correlation_id,
        payload={"report_id": request.id, "area": request.area, "entry_count": request.entry_count},
    )
    return _make_accept_response(job)


def enqueue_sync_job(db: Session, request: Optional[schemas.SyncJobCreate] = None) -> schemas.JobAcceptedResponse:
    area = request.area if request else None
    dedupe_key = _hash_text(f"sync:{area or 'all'}:{_time_bucket()}")
    payload = {"area": area}
    job = _enqueue_job(db, job_type="sync", payload=payload, dedupe_key=dedupe_key, max_attempts=3)

    existing = db.query(models.SyncRun).filter(models.SyncRun.job_id == job.job_id).first()
    if not existing:
        db.add(models.SyncRun(job_id=job.job_id, area=area, status=job.status))
        db.commit()

    record_event(
        db,
        event_type="sync_requested",
        aggregate_type="sync_job",
        aggregate_id=job.job_id,
        job_id=job.job_id,
        correlation_id=job.correlation_id,
        payload={"area": area},
    )
    return _make_accept_response(job)


def get_job_status(db: Session, job_id: str) -> schemas.JobStatusResponse:
    job = db.query(models.JobQueue).filter(models.JobQueue.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return _serialize_job(job)


def get_job_events(db: Session, job_id: str) -> List[schemas.EventJournalResponse]:
    job = db.query(models.JobQueue).filter(models.JobQueue.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return list_job_events(db, job_id)


def get_queue_stats(db: Session) -> Dict[str, Any]:
    queue_depth = db.query(models.JobQueue).filter(models.JobQueue.status.in_(list(ACTIVE_JOB_STATUSES))).count()
    stats = {
        "worker_running": _worker_started and _worker_thread is not None and _worker_thread.is_alive(),
        "queue_depth": queue_depth,
        "pending_scan_jobs": db.query(models.JobQueue).filter(
            models.JobQueue.job_type == "scan",
            models.JobQueue.status.in_(list(ACTIVE_JOB_STATUSES)),
        ).count(),
        "pending_report_jobs": db.query(models.JobQueue).filter(
            models.JobQueue.job_type == "report",
            models.JobQueue.status.in_(list(ACTIVE_JOB_STATUSES)),
        ).count(),
        "pending_sync_jobs": db.query(models.JobQueue).filter(
            models.JobQueue.job_type == "sync",
            models.JobQueue.status.in_(list(ACTIVE_JOB_STATUSES)),
        ).count(),
    }
    stats.update(sync_service.get_sync_stats(db))
    return stats


def start_worker() -> None:
    global _worker_thread, _worker_started
    with _worker_lock:
        if _worker_thread is not None and _worker_thread.is_alive():
            return
        _worker_stop_event.clear()
        _worker_thread = threading.Thread(target=_worker_loop, name="gatiq-job-worker", daemon=True)
        _worker_thread.start()
        _worker_started = True


def stop_worker() -> None:
    _worker_stop_event.set()


def _worker_loop() -> None:
    while not _worker_stop_event.is_set():
        processed = False
        db = database.SessionLocal()
        try:
            job = _claim_next_job(db)
            if job is not None:
                processed = True
                _run_job(db, job.job_id)
        except Exception as exc:
            print(f"Job worker loop error: {exc}")
        finally:
            db.close()

        if not processed:
            _worker_stop_event.wait(WORKER_IDLE_SECONDS)


def _claim_next_job(db: Session) -> Optional[models.JobQueue]:
    now = _utcnow()
    job = (
        db.query(models.JobQueue)
        .filter(
            models.JobQueue.status.in_([JOB_STATUS_QUEUED, JOB_STATUS_RETRYING]),
            or_(models.JobQueue.lease_expires_at.is_(None), models.JobQueue.lease_expires_at < now),
        )
        .order_by(models.JobQueue.priority.asc(), models.JobQueue.created_at.asc())
        .first()
    )
    if not job:
        return None

    job.status = JOB_STATUS_RUNNING
    job.started_at = now
    job.lease_expires_at = now + datetime.timedelta(seconds=WORKER_LEASE_SECONDS)
    db.commit()
    db.refresh(job)
    record_event(
        db,
        event_type=f"{job.job_type}_started",
        aggregate_type="job",
        aggregate_id=job.job_id,
        job_id=job.job_id,
        correlation_id=job.correlation_id,
        payload={"job_type": job.job_type, "attempt_count": job.attempt_count + 1},
    )
    return job


def _run_job(db: Session, job_id: str) -> None:
    job = db.query(models.JobQueue).filter(models.JobQueue.job_id == job_id).first()
    if not job:
        return

    try:
        job.attempt_count += 1
        db.commit()
        if job.job_type == "scan":
            result = _process_scan_job(db, job)
        elif job.job_type == "report":
            result = _process_report_job(db, job)
        elif job.job_type == "sync":
            result = _process_sync_job(db, job)
        else:
            raise RuntimeError(f"Unsupported job type: {job.job_type}")

        job.status = JOB_STATUS_SUCCEEDED
        job.result_json = _dumps(result)
        job.error_message = None
        job.completed_at = _utcnow()
        job.lease_expires_at = None
        db.commit()
        record_event(
            db,
            event_type=f"{job.job_type}_succeeded",
            aggregate_type="job",
            aggregate_id=job.job_id,
            job_id=job.job_id,
            correlation_id=job.correlation_id,
            payload=result,
        )
    except RetryableJobError as exc:
        job.error_message = str(exc)
        job.lease_expires_at = None
        if job.attempt_count >= job.max_attempts:
            job.status = JOB_STATUS_FAILED
            job.completed_at = _utcnow()
        else:
            job.status = JOB_STATUS_RETRYING
        db.commit()
        record_event(
            db,
            event_type=f"{job.job_type}_{job.status}",
            aggregate_type="job",
            aggregate_id=job.job_id,
            job_id=job.job_id,
            correlation_id=job.correlation_id,
            payload={"error": str(exc), "attempt_count": job.attempt_count},
        )
    except Exception as exc:
        job.status = JOB_STATUS_FAILED
        job.error_message = str(exc)
        job.completed_at = _utcnow()
        job.lease_expires_at = None
        db.commit()
        record_event(
            db,
            event_type=f"{job.job_type}_failed",
            aggregate_type="job",
            aggregate_id=job.job_id,
            job_id=job.job_id,
            correlation_id=job.correlation_id,
            payload={"error": str(exc), "attempt_count": job.attempt_count},
        )


def _process_scan_job(db: Session, job: models.JobQueue) -> Dict[str, Any]:
    scan_job = db.query(models.ScanJob).filter(models.ScanJob.job_id == job.job_id).first()
    if not scan_job:
        raise RuntimeError("Scan job metadata missing")

    # ── Phase 1: Multi-frame for CCTV ──
    try:
        if scan_job.source == "webcam":
            response = ai_runtime.scan_base64_image(scan_job.image_base64 or "")
        else:
            response = ai_runtime.scan_cctv_multi_frame(scan_job.rtsp_url or "")
    except HTTPException as exc:
        if exc.status_code == 503:
            ai_runtime.warmup_async()
            raise RetryableJobError(str(exc.detail)) from exc
        raise RuntimeError(str(exc.detail)) from exc

    # ── Record camera health ──
    if scan_job.source == "cctv" and scan_job.rtsp_url:
        from .camera_service import record_camera_success
        record_camera_success(db, scan_job.rtsp_url)

    seen = set()
    review_ids: List[int] = []
    log_ids: List[int] = []
    enriched_vehicles: List[Dict[str, Any]] = []

    for vehicle in response.vehicles:
        plate_number = (vehicle.plate_number or "").strip().upper()
        if not plate_number or plate_number in seen:
            continue
        seen.add(plate_number)

        # Build enriched vehicle dict
        enriched = _model_dump(vehicle)

        # Create scan result with confidence data
        scan_result = models.ScanResult(
            scan_job_id=job.job_id,
            site_id=scan_job.site_id,
            gate_id=scan_job.gate_id,
            detected_plate=plate_number,
            direction=vehicle.direction,
            tagging=vehicle.tagging,
            vehicle_type=vehicle.vehicle_type,
            raw_payload_json=_dumps(enriched),
            detector_confidence=str(getattr(vehicle, 'detector_confidence', '') or ''),
            ocr_confidence=str(getattr(vehicle, 'ocr_confidence', '') or ''),
            quality_level=getattr(vehicle, 'quality_level', None),
            quality_hints_json=_dumps(getattr(vehicle, 'quality_hints', None)),
            failure_reason=getattr(vehicle, 'failure_reason', None),
        )
        db.add(scan_result)
        db.commit()
        db.refresh(scan_result)

        # ── Phase 1: Create ScanReview instead of direct VehicleLog ──
        if plate_number != "UNREADABLE":
            review = review_service.create_review_from_scan(
                db,
                scan_job=scan_job,
                scan_result=scan_result,
                vehicle=enriched,
            )
            review_ids.append(review.id)

        enriched_vehicles.append(enriched)

    record_event(
        db,
        event_type="scan_completed",
        aggregate_type="scan_job",
        aggregate_id=job.job_id,
        job_id=job.job_id,
        correlation_id=job.correlation_id,
        payload={"review_ids": review_ids, "vehicle_count": len(response.vehicles)},
    )

    scan_job.detection_summary = _dumps(
        {
            "vehicles": enriched_vehicles,
            "detection_time": response.detection_time,
            "provider": response.provider,
        }
    )
    scan_job.created_log_ids = _dumps({"log_ids": log_ids})
    scan_job.report_job_ids = _dumps({"report_job_ids": []})
    db.commit()

    return {
        "vehicles": enriched_vehicles,
        "detection_time": response.detection_time,
        "provider": response.provider,
        "log_ids": log_ids,
        "report_job_ids": [],
        "review_ids": review_ids,
    }


def _process_report_job(db: Session, job: models.JobQueue) -> Dict[str, Any]:
    report_job = db.query(models.ReportJob).filter(models.ReportJob.job_id == job.job_id).first()
    if not report_job:
        raise RuntimeError("Report job metadata missing")

        report = report_service.ensure_pdf_report(
        db,
        report_id=report_job.report_id,
        name=report_job.name,
        area=report_job.area,
        timestamp=report_job.timestamp,
        entry_count=report_job.entry_count,
        site_id=report_job.site_id,
        gate_id=report_job.gate_id,
        device_id=report_job.device_id,
        user_id=report_job.user_id,
        gate_no=report_job.gate_no,
    )
    report_job.result_report_id = report.id
    db.commit()
    record_event(
        db,
        event_type="report_created",
        aggregate_type="report",
        aggregate_id=report.id,
        job_id=job.job_id,
        correlation_id=job.correlation_id,
        payload={"report_id": report.id, "entry_count": report.entry_count},
    )
    return {
        "report_id": report.id,
        "name": report.name,
        "area": report.area,
        "timestamp": str(report.timestamp),
        "entry_count": report.entry_count,
    }


def _process_sync_job(db: Session, job: models.JobQueue) -> Dict[str, Any]:
    payload = _job_payload(job)
    area = payload.get("area")
    result = sync_service.process_sync_batch(
        db,
        job_id=job.job_id,
        correlation_id=job.correlation_id,
        area=area,
    )

    sync_run = db.query(models.SyncRun).filter(models.SyncRun.job_id == job.job_id).first()
    if sync_run:
        sync_run.status = JOB_STATUS_FAILED if result["failed_count"] and not result["synced_count"] else JOB_STATUS_SUCCEEDED
        sync_run.synced_count = result["synced_count"]
        sync_run.failed_count = result["failed_count"]
        sync_run.last_error = result["failures"][0]["error"] if result.get("failures") else None
        sync_run.started_at = job.started_at
        sync_run.completed_at = _utcnow()
        db.commit()

    record_event(
        db,
        event_type="sync_completed",
        aggregate_type="sync_run",
        aggregate_id=job.job_id,
        job_id=job.job_id,
        correlation_id=job.correlation_id,
        payload=result,
    )

    return result
