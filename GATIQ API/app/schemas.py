import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class VehicleLogCreate(BaseModel):
    site_id: Optional[int] = None
    gate_id: Optional[int] = None
    device_id: Optional[int] = None
    user_id: Optional[int] = None
    vehicle_no: str
    vehicle_type: str
    gate_no: str
    area: str
    entry_exit: str
    purpose: Optional[str] = None
    tagging: Optional[str] = None
    vehicle_capacity: Optional[str] = None
    dock_no: Optional[str] = None
    consignment_no: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    status: Optional[str] = None


class VehicleLogResponse(VehicleLogCreate):
    id: int
    is_synced: bool
    timestamp: datetime.datetime

    class Config:
        from_attributes = True


class PlateDetection(BaseModel):
    plate_number: str
    direction: str
    tagging: str
    vehicle_type: Optional[str] = "Unknown"


class ScanRequest(BaseModel):
    image_base64: str


class CCTVScanRequest(BaseModel):
    rtsp_url: str


class ScanResponse(BaseModel):
    vehicles: List[PlateDetection]
    detection_time: str
    provider: str


class ScanJobOptions(BaseModel):
    site_id: Optional[int] = None
    gate_id: Optional[int] = None
    user_id: Optional[int] = None
    area: str
    gate_no: str
    facility_name: Optional[str] = None
    purpose: Optional[str] = None
    tagging: Optional[str] = None
    vehicle_type: Optional[str] = "Car"
    vehicle_capacity: Optional[str] = None
    dock_no: Optional[str] = None
    consignment_no: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    status: Optional[str] = None
    operator_name: Optional[str] = None
    device_id: Optional[str] = None


class ScanJobCreate(ScanJobOptions):
    image_base64: str


class CCTVScanJobCreate(ScanJobOptions):
    rtsp_url: str


class ScanJobResult(BaseModel):
    vehicles: List[PlateDetection]
    detection_time: str
    provider: str
    log_ids: List[int] = Field(default_factory=list)
    report_job_ids: List[str] = Field(default_factory=list)


class WhitelistBase(BaseModel):
    vehicle_no: str
    owner_name: str
    flat_no: Optional[str] = None
    contact: Optional[str] = None
    category: str = "Regular"
    status: str = "Active"


class WhitelistCreate(WhitelistBase):
    pass


class WhitelistResponse(WhitelistBase):
    id: int

    class Config:
        from_attributes = True


class PDFReportSchema(BaseModel):
    id: str
    site_id: Optional[int] = None
    gate_id: Optional[int] = None
    device_id: Optional[int] = None
    user_id: Optional[int] = None
    name: str
    area: str
    timestamp: datetime.datetime
    entry_count: int

    class Config:
        from_attributes = True


class ReportJobCreate(BaseModel):
    id: str
    site_id: Optional[int] = None
    gate_id: Optional[int] = None
    device_id: Optional[int] = None
    user_id: Optional[int] = None
    name: str
    area: str
    gate_no: Optional[str] = None
    timestamp: datetime.datetime
    entry_count: int
    snapshot: Optional[Dict[str, Any]] = None


class SyncJobCreate(BaseModel):
    area: Optional[str] = None


class SyncStatusResponse(BaseModel):
    pending_sync_records: int
    failed_sync_records: int
    last_synced_at: Optional[str] = None


class JobAcceptedResponse(BaseModel):
    job_id: str
    status: str
    job_type: str
    correlation_id: str
    poll_interval_ms: int


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    job_type: str
    correlation_id: str
    attempt_count: int
    max_attempts: int
    created_at: datetime.datetime
    started_at: Optional[datetime.datetime] = None
    completed_at: Optional[datetime.datetime] = None
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None


class EventJournalResponse(BaseModel):
    id: int
    event_type: str
    aggregate_type: str
    aggregate_id: str
    job_id: Optional[str] = None
    correlation_id: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class SuccessStatus(BaseModel):
    success: bool
    message: str
    id: Optional[int] = None
