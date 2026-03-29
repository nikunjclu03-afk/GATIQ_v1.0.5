import json
from sqlalchemy.orm import Session
from .. import models, schemas

def log_audit_event(
    db: Session,
    actor_id: str,
    action: str,
    entity_type: str,
    entity_id: str,
    actor_name: str = None,
    old_values: dict = None,
    new_values: dict = None,
    reason: str = None
) -> models.AuditEvent:
    db_event = models.AuditEvent(
        actor_id=actor_id,
        actor_name=actor_name,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_values_json=json.dumps(old_values) if old_values else None,
        new_values_json=json.dumps(new_values) if new_values else None,
        reason=reason
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

def get_audit_events(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.AuditEvent).order_by(models.AuditEvent.created_at.desc()).offset(skip).limit(limit).all()
