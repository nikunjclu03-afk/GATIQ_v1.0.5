from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models
from .. import schemas
from ..dependencies import get_api_key, get_db
from ..services.job_service import enqueue_sync_job, get_job_status

router = APIRouter(tags=["sync"])


@router.post("/sync", dependencies=[Depends(get_api_key)])
def sync_logs(db: Session = Depends(get_db)):
    unsynced = db.query(models.VehicleLog).filter(models.VehicleLog.is_synced == False).all()
    if not unsynced:
        return {"message": "All logs already synced."}

    for log in unsynced:
        log.is_synced = True

    db.commit()
    return {"message": f"Successfully synced {len(unsynced)} logs to central server."}


@router.post("/sync/jobs", response_model=schemas.JobAcceptedResponse, dependencies=[Depends(get_api_key)])
def create_sync_job(request: schemas.SyncJobCreate | None = None, db: Session = Depends(get_db)):
    return enqueue_sync_job(db, request or schemas.SyncJobCreate())


@router.get("/sync/jobs/{job_id}", response_model=schemas.JobStatusResponse, dependencies=[Depends(get_api_key)])
def read_sync_job(job_id: str, db: Session = Depends(get_db)):
    return get_job_status(db, job_id)
