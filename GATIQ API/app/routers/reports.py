from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..dependencies import get_api_key, get_db
from ..services.job_service import enqueue_report_job, get_job_status
from ..services.report_service import ensure_pdf_report

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("", response_model=List[schemas.PDFReportSchema], dependencies=[Depends(get_api_key)])
def list_reports(area: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.PDFReport)
    if area:
        query = query.filter(models.PDFReport.area == area)
    return query.order_by(models.PDFReport.timestamp.desc()).all()


@router.post("", response_model=schemas.PDFReportSchema, dependencies=[Depends(get_api_key)])
def save_report_metadata(report: schemas.PDFReportSchema, db: Session = Depends(get_db)):
    return ensure_pdf_report(
        db,
        report_id=report.id,
        name=report.name,
        area=report.area,
        timestamp=report.timestamp,
        entry_count=report.entry_count,
    )


@router.post("/jobs", response_model=schemas.JobAcceptedResponse, dependencies=[Depends(get_api_key)])
def create_report_job(request: schemas.ReportJobCreate, db: Session = Depends(get_db)):
    return enqueue_report_job(db, request)


@router.get("/jobs/{job_id}", response_model=schemas.JobStatusResponse, dependencies=[Depends(get_api_key)])
def read_report_job(job_id: str, db: Session = Depends(get_db)):
    return get_job_status(db, job_id)


@router.delete("/{report_id}", response_model=schemas.SuccessStatus, dependencies=[Depends(get_api_key)])
def delete_report(report_id: str, db: Session = Depends(get_db)):
    report = db.query(models.PDFReport).filter(models.PDFReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    db.delete(report)
    db.commit()
    return {"success": True, "message": "Report record deleted"}
