"""
Phase 3: Correction Feedback Service
Persists OCR correction data for manual corrections made during review.
This data can be exported for AI retraining pipelines.
"""
import json
from typing import Optional
from sqlalchemy.orm import Session

from .. import models


def record_correction(
    db: Session,
    *,
    scan_result_id: Optional[int] = None,
    review_id: Optional[int] = None,
    original_plate: str,
    corrected_plate: str,
    original_ocr_candidates: Optional[list] = None,
    detector_confidence: Optional[str] = None,
    ocr_confidence: Optional[str] = None,
    quality_level: Optional[str] = None,
    quality_hints: Optional[list] = None,
    operator_action: str = "edit_and_confirm",
    operator_id: Optional[str] = None,
) -> models.CorrectionFeedback:
    """Record a manual correction for future AI retraining."""
    feedback = models.CorrectionFeedback(
        scan_result_id=scan_result_id,
        review_id=review_id,
        original_plate=original_plate,
        corrected_plate=corrected_plate,
        original_ocr_candidates_json=json.dumps(original_ocr_candidates) if original_ocr_candidates else None,
        detector_confidence=detector_confidence,
        ocr_confidence=ocr_confidence,
        quality_level=quality_level,
        quality_hints_json=json.dumps(quality_hints) if quality_hints else None,
        operator_action=operator_action,
        operator_id=operator_id,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback


def get_correction_feedback(db: Session, skip: int = 0, limit: int = 200):
    """List all correction feedback entries for export / review."""
    return db.query(models.CorrectionFeedback).order_by(
        models.CorrectionFeedback.created_at.desc()
    ).offset(skip).limit(limit).all()
