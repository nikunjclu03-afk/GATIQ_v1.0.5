"""
Phase 1: Scan Review Queue Service
Handles the review workflow — scan → pending_review → confirm/reject/unreadable → log
"""
import datetime
import json
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from .. import models, schemas
from .event_service import record_event
from .log_service import create_vehicle_log
from .vehicle_service import check_duplicate_flags, record_visit_entry
from .audit_service import log_audit_event


def _utcnow():
    return datetime.datetime.utcnow()


def _loads(val: Optional[str]):
    if not val:
        return None
    try:
        return json.loads(val)
    except json.JSONDecodeError:
        return None


def _dumps(val) -> Optional[str]:
    if val is None:
        return None
    return json.dumps(val, default=str)


def serialize_review(review: models.ScanReview) -> schemas.ScanReviewResponse:
    return schemas.ScanReviewResponse(
        id=review.id,
        scan_job_id=review.scan_job_id,
        scan_result_id=review.scan_result_id,
        site_id=review.site_id,
        gate_id=review.gate_id,
        detected_plate=review.detected_plate,
        corrected_plate=review.corrected_plate,
        direction=review.direction,
        tagging=review.tagging,
        vehicle_type=review.vehicle_type,
        purpose=review.purpose,
        area=review.area,
        gate_no=review.gate_no,
        detector_confidence=review.detector_confidence,
        ocr_confidence=review.ocr_confidence,
        quality_level=review.quality_level,
        quality_hints=_loads(review.quality_hints_json) or [],
        failure_reason=review.failure_reason,
        status=review.status,
        reviewed_by=review.reviewed_by,
        reviewed_at=review.reviewed_at,
        review_note=review.review_note,
        created_log_id=review.created_log_id,
        duplicate_flags=_loads(review.duplicate_flags_json),
        created_at=review.created_at,
    )


def create_review_from_scan(
    db: Session,
    *,
    scan_job: models.ScanJob,
    scan_result: models.ScanResult,
    vehicle: Dict[str, Any],
    diagnostics: Optional[Dict[str, Any]] = None,
) -> models.ScanReview:
    """Create a pending_review item from a scan result instead of a direct log."""
    plate = (vehicle.get("plate_number") or "").strip().upper()

    # Extract confidence data
    det_conf = str(vehicle.get("detector_confidence", ""))
    ocr_conf = str(vehicle.get("ocr_confidence", ""))
    quality_level = vehicle.get("quality_level", "")
    quality_hints = vehicle.get("quality_hints", [])
    failure_reason = vehicle.get("failure_reason", "")

    # Determine if review is really needed (low confidence or special cases)
    needs_review = True  # All scans go through review in Phase 1

    # Check for duplicates
    dup_flags = check_duplicate_flags(db, plate, site_id=scan_job.site_id)

    review = models.ScanReview(
        scan_job_id=scan_job.job_id,
        scan_result_id=scan_result.id,
        site_id=scan_job.site_id,
        gate_id=scan_job.gate_id,
        device_id=scan_job.device_row_id,
        user_id=scan_job.user_id,
        detected_plate=plate,
        direction=vehicle.get("direction", "Entry"),
        tagging=vehicle.get("tagging", ""),
        vehicle_type=vehicle.get("vehicle_type", "Car"),
        purpose=scan_job.purpose,
        area=scan_job.area,
        gate_no=scan_job.gate_no,
        detector_confidence=det_conf,
        ocr_confidence=ocr_conf,
        quality_level=quality_level,
        quality_hints_json=_dumps(quality_hints),
        failure_reason=failure_reason if plate == "UNREADABLE" else None,
        status="pending_review",
        duplicate_flags_json=_dumps(dup_flags) if dup_flags else None,
        vehicle_capacity=scan_job.vehicle_capacity,
        dock_no=scan_job.dock_no,
        consignment_no=scan_job.consignment_no,
        driver_name=scan_job.driver_name,
        driver_phone=scan_job.driver_phone,
        status_label=scan_job.status_label,
        operator_name=scan_job.operator_name,
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    # Link scan result to review
    scan_result.review_id = review.id
    scan_result.review_required = True
    db.commit()

    record_event(
        db,
        event_type="scan_review_created",
        aggregate_type="scan_review",
        aggregate_id=str(review.id),
        payload={
            "scan_job_id": scan_job.job_id,
            "detected_plate": plate,
            "status": review.status,
            "quality_level": quality_level,
            "duplicate_flags": dup_flags,
        },
    )
    return review


def list_reviews(
    db: Session,
    *,
    status: Optional[str] = None,
    area: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[schemas.ScanReviewResponse]:
    query = db.query(models.ScanReview)
    if status:
        query = query.filter(models.ScanReview.status == status)
    if area:
        query = query.filter(models.ScanReview.area == area)
    reviews = query.order_by(models.ScanReview.created_at.desc()).offset(skip).limit(limit).all()
    return [serialize_review(r) for r in reviews]


def get_review(db: Session, review_id: int) -> Optional[schemas.ScanReviewResponse]:
    review = db.query(models.ScanReview).filter(models.ScanReview.id == review_id).first()
    if not review:
        return None
    return serialize_review(review)


def confirm_review(
    db: Session,
    review_id: int,
    request: schemas.ReviewConfirmRequest,
) -> schemas.ScanReviewResponse:
    review = db.query(models.ScanReview).filter(models.ScanReview.id == review_id).first()
    if not review:
        raise ValueError("Review not found")
    if review.status != "pending_review":
        raise ValueError(f"Review is already {review.status}")

    # Apply corrections if provided
    final_plate = (request.corrected_plate or review.detected_plate).strip().upper()
    final_direction = request.direction or review.direction or "Entry"
    final_tagging = request.tagging or review.tagging
    final_vehicle_type = request.vehicle_type or review.vehicle_type or "Car"
    final_purpose = request.purpose or review.purpose

    review.corrected_plate = final_plate if final_plate != review.detected_plate else None
    review.status = "confirmed"
    review.reviewed_by = request.reviewer_user_id
    review.reviewed_at = _utcnow()
    review.review_note = request.review_note

    # Re-check duplicates with final plate
    dup_flags = check_duplicate_flags(db, final_plate, site_id=review.site_id)
    review.duplicate_flags_json = _dumps(dup_flags) if dup_flags else None

    # Now create the actual vehicle log
    log_entry = schemas.VehicleLogCreate(
        vehicle_no=final_plate,
        vehicle_type=final_vehicle_type,
        gate_no=review.gate_no or "Gate 1",
        area=review.area or "",
        entry_exit=final_direction,
        purpose=final_purpose,
        tagging=final_tagging,
        vehicle_capacity=review.vehicle_capacity,
        dock_no=review.dock_no,
        consignment_no=review.consignment_no,
        driver_name=review.driver_name,
        driver_phone=review.driver_phone,
        status=review.status_label or final_direction,
        site_id=review.site_id,
        gate_id=review.gate_id,
        device_id=review.device_id,
        user_id=review.user_id,
    )
    created_log = create_vehicle_log(log_entry, db)
    review.created_log_id = created_log.id
    db.commit()
    db.refresh(review)

    # Record visit entry
    record_visit_entry(db, log=created_log, source_type="scan", review_status="confirmed")

    record_event(
        db,
        event_type="scan_review_confirmed",
        aggregate_type="scan_review",
        aggregate_id=str(review.id),
        payload={
            "final_plate": final_plate,
            "log_id": created_log.id,
            "corrected": review.corrected_plate is not None,
            "duplicate_flags": dup_flags,
        },
    )

    log_audit_event(
        db,
        actor_id=str(request.reviewer_user_id) if request.reviewer_user_id else "system",
        action="confirm",
        entity_type="ScanReview",
        entity_id=str(review.id),
        new_values={"final_plate": final_plate, "log_id": created_log.id},
        reason=request.review_note
    )

    return serialize_review(review)


def reject_review(
    db: Session,
    review_id: int,
    request: schemas.ReviewRejectRequest,
) -> schemas.ScanReviewResponse:
    review = db.query(models.ScanReview).filter(models.ScanReview.id == review_id).first()
    if not review:
        raise ValueError("Review not found")
    if review.status != "pending_review":
        raise ValueError(f"Review is already {review.status}")

    review.status = "rejected"
    review.reviewed_by = request.reviewer_user_id
    review.reviewed_at = _utcnow()
    review.review_note = request.review_note
    db.commit()
    db.refresh(review)

    record_event(
        db,
        event_type="scan_review_rejected",
        aggregate_type="scan_review",
        aggregate_id=str(review.id),
        payload={"detected_plate": review.detected_plate, "note": request.review_note},
    )

    log_audit_event(
        db,
        actor_id=str(request.reviewer_user_id) if request.reviewer_user_id else "system",
        action="reject",
        entity_type="ScanReview",
        entity_id=str(review.id),
        old_values={"detected_plate": review.detected_plate},
        reason=request.review_note
    )

    return serialize_review(review)


def mark_unreadable(
    db: Session,
    review_id: int,
    request: schemas.ReviewRejectRequest,
) -> schemas.ScanReviewResponse:
    review = db.query(models.ScanReview).filter(models.ScanReview.id == review_id).first()
    if not review:
        raise ValueError("Review not found")
    if review.status != "pending_review":
        raise ValueError(f"Review is already {review.status}")

    review.status = "unreadable"
    review.reviewed_by = request.reviewer_user_id
    review.reviewed_at = _utcnow()
    review.review_note = request.review_note
    db.commit()
    db.refresh(review)

    record_event(
        db,
        event_type="scan_review_unreadable",
        aggregate_type="scan_review",
        aggregate_id=str(review.id),
        payload={"detected_plate": review.detected_plate, "note": request.review_note},
    )
    return serialize_review(review)
