"""Phase 3: Report Export Router"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import os

from .. import schemas
from ..dependencies import get_api_key, get_db
from ..services import export_service

router = APIRouter(prefix="/reports", tags=["Report Exports"])


@router.post("/export", response_model=schemas.ReportExportJobResponse, dependencies=[Depends(get_api_key)])
def create_export(request: schemas.ReportExportRequest, db: Session = Depends(get_db)):
    job = export_service.create_csv_export(db, request)
    if job.status == "failed":
        raise HTTPException(status_code=500, detail=f"Export failed: {job.result_path}")
    return job


@router.get("/export/jobs", response_model=List[schemas.ReportExportJobResponse], dependencies=[Depends(get_api_key)])
def list_export_jobs(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    return export_service.get_export_jobs(db, skip=skip, limit=limit)


@router.get("/export/download/{job_id}", dependencies=[Depends(get_api_key)])
def download_export(job_id: int, db: Session = Depends(get_db)):
    from .. import models
    job = db.query(models.ReportExportJob).filter(models.ReportExportJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Export job not found")
    if job.status != "completed" or not job.result_path or not os.path.exists(job.result_path):
        raise HTTPException(status_code=404, detail="Export file not available")
    return FileResponse(
        job.result_path,
        media_type="text/csv",
        filename=os.path.basename(job.result_path)
    )
