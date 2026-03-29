from sqlalchemy.orm import Session
from .. import models, schemas
import uuid
import os
import time

def create_incident(db: Session, incident_data: schemas.IncidentCreate):
    db_incident = models.IncidentRecord(
        log_id=incident_data.log_id,
        review_id=incident_data.review_id,
        reporter_id=incident_data.reporter_id,
        severity_flag=incident_data.severity_flag,
        note=incident_data.note,
        media_path=incident_data.media_path,
        status="open"
    )
    db.add(db_incident)
    db.commit()
    db.refresh(db_incident)
    return db_incident

def resolve_incident(db: Session, incident_id: int, resolver_id: str):
    db_incident = db.query(models.IncidentRecord).filter(models.IncidentRecord.id == incident_id).first()
    if db_incident:
        db_incident.status = "resolved"
        db_incident.resolver_id = resolver_id
        db_incident.resolved_at = time.strftime('%Y-%m-%d %H:%M:%S')
        db.commit()
        db.refresh(db_incident)
    return db_incident

def get_incidents(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.IncidentRecord).order_by(models.IncidentRecord.created_at.desc()).offset(skip).limit(limit).all()
