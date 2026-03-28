import json
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from .. import models, schemas


def _dumps(payload: Optional[Dict[str, Any]]) -> Optional[str]:
    if payload is None:
        return None
    return json.dumps(payload, default=str)


def _loads(payload_json: Optional[str]) -> Optional[Dict[str, Any]]:
    if not payload_json:
        return None
    try:
        return json.loads(payload_json)
    except json.JSONDecodeError:
        return {"raw": payload_json}


def record_event(
    db: Session,
    event_type: str,
    aggregate_type: str,
    aggregate_id: str,
    *,
    job_id: Optional[str] = None,
    correlation_id: Optional[str] = None,
    payload: Optional[Dict[str, Any]] = None,
) -> models.EventJournal:
    event = models.EventJournal(
        event_type=event_type,
        aggregate_type=aggregate_type,
        aggregate_id=aggregate_id,
        job_id=job_id,
        correlation_id=correlation_id,
        payload_json=_dumps(payload),
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def serialize_event(event: models.EventJournal) -> schemas.EventJournalResponse:
    return schemas.EventJournalResponse(
        id=event.id,
        event_type=event.event_type,
        aggregate_type=event.aggregate_type,
        aggregate_id=event.aggregate_id,
        job_id=event.job_id,
        correlation_id=event.correlation_id,
        payload=_loads(event.payload_json),
        created_at=event.created_at,
    )


def list_job_events(db: Session, job_id: str) -> List[schemas.EventJournalResponse]:
    events = (
        db.query(models.EventJournal)
        .filter(models.EventJournal.job_id == job_id)
        .order_by(models.EventJournal.id.asc())
        .all()
    )
    return [serialize_event(event) for event in events]
