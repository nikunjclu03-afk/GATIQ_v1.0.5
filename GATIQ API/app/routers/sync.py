from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models
from .. import schemas
from ..dependencies import get_api_key, get_db
from ..services.job_service import enqueue_sync_job, get_job_status
from ..services.sync_service import get_sync_stats, process_sync_batch

router = APIRouter(tags=["sync"])


@router.post("/sync", dependencies=[Depends(get_api_key)])
def sync_logs(db: Session = Depends(get_db)):
    result = process_sync_batch(db, job_id="legacy-sync", correlation_id="legacy-sync", area=None)
    return {"message": f"Processed sync batch. Synced {result['synced_count']} records.", "result": result}


@router.post("/sync/jobs", response_model=schemas.JobAcceptedResponse, dependencies=[Depends(get_api_key)])
def create_sync_job(request: schemas.SyncJobCreate | None = None, db: Session = Depends(get_db)):
    return enqueue_sync_job(db, request or schemas.SyncJobCreate())


@router.get("/sync/jobs/{job_id}", response_model=schemas.JobStatusResponse, dependencies=[Depends(get_api_key)])
def read_sync_job(job_id: str, db: Session = Depends(get_db)):
    return get_job_status(db, job_id)


@router.get("/sync/status", response_model=schemas.SyncStatusResponse, dependencies=[Depends(get_api_key)])
def read_sync_status(db: Session = Depends(get_db)):
    return schemas.SyncStatusResponse(**get_sync_stats(db))
