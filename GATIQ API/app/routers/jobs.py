from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import schemas
from ..dependencies import get_api_key, get_db
from ..services.job_service import get_job_events, get_job_status

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/{job_id}", response_model=schemas.JobStatusResponse, dependencies=[Depends(get_api_key)])
def read_job_status(job_id: str, db: Session = Depends(get_db)):
    return get_job_status(db, job_id)


@router.get(
    "/{job_id}/events",
    response_model=List[schemas.EventJournalResponse],
    dependencies=[Depends(get_api_key)],
)
def read_job_events(job_id: str, db: Session = Depends(get_db)):
    return get_job_events(db, job_id)
