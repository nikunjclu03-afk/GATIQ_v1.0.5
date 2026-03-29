from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import database, schemas
from ..services import incident_service

router = APIRouter(prefix="/incidents", tags=["Incidents"])

@router.post("", response_model=schemas.IncidentResponse)
def create_incident(incident: schemas.IncidentCreate, db: Session = Depends(database.get_db)):
    return incident_service.create_incident(db, incident)

@router.get("", response_model=List[schemas.IncidentResponse])
def get_incidents(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    return incident_service.get_incidents(db, skip=skip, limit=limit)

@router.post("/{incident_id}/resolve", response_model=schemas.IncidentResponse)
def resolve_incident(incident_id: int, resolver_id: str, db: Session = Depends(database.get_db)):
    incident = incident_service.resolve_incident(db, incident_id, resolver_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident
