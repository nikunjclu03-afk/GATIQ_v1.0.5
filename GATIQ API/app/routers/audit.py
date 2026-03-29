from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from .. import database, models, schemas
from ..services import audit_service

router = APIRouter(prefix="/audit", tags=["Audit Logs"])

@router.get("/events", response_model=List[schemas.AuditEventResponse])
def read_audit_events(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    # Note: RBAC checks should be added here later to ensure only 'admin' role can view this
    return audit_service.get_audit_events(db, skip=skip, limit=limit)
