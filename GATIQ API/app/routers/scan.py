from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import schemas
from ..dependencies import get_api_key, get_db
from ..services.ai_runtime import scan_base64_image, scan_cctv_stream
from ..services.job_service import enqueue_scan_job

router = APIRouter(prefix="/scan", tags=["scan"])


@router.post("/plate/jobs", response_model=schemas.JobAcceptedResponse, dependencies=[Depends(get_api_key)])
async def enqueue_plate_scan(request: schemas.ScanJobCreate, db: Session = Depends(get_db)):
    return enqueue_scan_job(db, source="webcam", request=request)


@router.post("/cctv/jobs", response_model=schemas.JobAcceptedResponse, dependencies=[Depends(get_api_key)])
async def enqueue_cctv_scan(request: schemas.CCTVScanJobCreate, db: Session = Depends(get_db)):
    return enqueue_scan_job(db, source="cctv", request=request)


@router.post("/plate", response_model=schemas.ScanResponse, dependencies=[Depends(get_api_key)])
async def scan_plate(request: schemas.ScanRequest):
    return scan_base64_image(request.image_base64)


@router.post("/cctv", response_model=schemas.ScanResponse, dependencies=[Depends(get_api_key)])
async def scan_cctv(request: schemas.CCTVScanRequest):
    return scan_cctv_stream(request.rtsp_url)
