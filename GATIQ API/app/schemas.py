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


# ─── Phase 1: Gate Ops Core Schemas ──────────────────────────────────

class EnrichedPlateDetection(BaseModel):
    plate_number: str
    direction: str
    tagging: str
    vehicle_type: Optional[str] = "Unknown"
    detector_confidence: Optional[float] = None
    ocr_confidence: Optional[float] = None
    quality_level: Optional[str] = None  # good | fair | poor
    quality_hints: List[str] = Field(default_factory=list)
    best_frame_index: Optional[int] = None
    failure_reason: Optional[str] = None
    review_required: bool = False
    candidates: List[Dict[str, Any]] = Field(default_factory=list)


class ScanReviewResponse(BaseModel):
    id: int
    scan_job_id: Optional[str] = None
    scan_result_id: Optional[int] = None
    site_id: Optional[int] = None
    gate_id: Optional[int] = None
    detected_plate: str
    corrected_plate: Optional[str] = None
    direction: Optional[str] = None
    tagging: Optional[str] = None
    vehicle_type: Optional[str] = None
    purpose: Optional[str] = None
    area: Optional[str] = None
    gate_no: Optional[str] = None
    detector_confidence: Optional[str] = None
    ocr_confidence: Optional[str] = None
    quality_level: Optional[str] = None
    quality_hints: List[str] = Field(default_factory=list)
    failure_reason: Optional[str] = None
    status: str
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime.datetime] = None
    review_note: Optional[str] = None
    created_log_id: Optional[int] = None
    duplicate_flags: Optional[Dict[str, Any]] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class ReviewConfirmRequest(BaseModel):
    corrected_plate: Optional[str] = None
    direction: Optional[str] = None
    tagging: Optional[str] = None
    vehicle_type: Optional[str] = None
    purpose: Optional[str] = None
    review_note: Optional[str] = None
    reviewer_user_id: Optional[int] = None


class ReviewRejectRequest(BaseModel):
    review_note: Optional[str] = None
    reviewer_user_id: Optional[int] = None


class DuplicateFlags(BaseModel):
    already_inside: bool = False
    recent_duplicate: bool = False
    repeat_scan_suspected: bool = False
    existing_visit_id: Optional[int] = None
    last_entry_at: Optional[str] = None


class VehicleTimelineSummary(BaseModel):
    normalized_plate: str
    total_visits: int
    open_visits: int
    last_entry_at: Optional[str] = None
    last_exit_at: Optional[str] = None
    avg_stay_duration_minutes: Optional[float] = None
    visits: List[Dict[str, Any]] = Field(default_factory=list)


class VehicleSearchResult(BaseModel):
    plate: str
    total_visits: int
    last_seen: Optional[str] = None
    current_status: str  # inside | outside | unknown


class ExceptionSummary(BaseModel):
    unreadable_scans: int = 0
    pending_reviews: int = 0
    pending_exits: int = 0
    overstay_vehicles: int = 0
    manual_entries: int = 0
    scan_failures: int = 0
    backend_failures: int = 0


class CameraHealthResponse(BaseModel):
    id: int
    source_id: str
    source_type: str
    label: Optional[str] = None
    is_online: bool
    last_success_at: Optional[datetime.datetime] = None
    last_frame_at: Optional[datetime.datetime] = None
    last_error: Optional[str] = None
    restart_supported: bool
    consecutive_failures: int

    class Config:
        from_attributes = True


class CameraHealthUpdate(BaseModel):
    source_id: str
    source_type: str = "rtsp"
    label: Optional[str] = None
    site_id: Optional[int] = None
    gate_id: Optional[int] = None
    is_online: Optional[bool] = None
    last_error: Optional[str] = None


class ScanJobResultV2(BaseModel):
    vehicles: List[EnrichedPlateDetection]
    detection_time: str
    provider: str
    log_ids: List[int] = Field(default_factory=list)
    report_job_ids: List[str] = Field(default_factory=list)
    review_ids: List[int] = Field(default_factory=list)


# --- Phase 2 Schemas ---

class AuditEventBase(BaseModel):
    actor_id: str
    actor_name: Optional[str] = None
    action: str
    entity_type: str
    entity_id: str
    old_values_json: Optional[str] = None
    new_values_json: Optional[str] = None
    reason: Optional[str] = None

class AuditEventResponse(AuditEventBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class IncidentCreate(BaseModel):
    log_id: Optional[int] = None
    review_id: Optional[int] = None
    reporter_id: str
    severity_flag: str
    note: Optional[str] = None
    media_path: Optional[str] = None

class IncidentResponse(IncidentCreate):
    id: int
    status: str
    created_at: datetime
    resolved_at: Optional[datetime] = None
    resolver_id: Optional[str] = None

    class Config:
        from_attributes = True

class WhitelistImportJobResponse(BaseModel):
    id: int
    filename: str
    operator_id: str
    status: str
    total_rows: int
    success_count: int
    error_count: int
    error_details_json: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PlanEntitlementResponse(BaseModel):
    id: int
    plan_tier: str
    max_cameras: int
    retention_days: int
    features_json: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Phase 3 Schemas ---

class CorrectionFeedbackResponse(BaseModel):
    id: int
    scan_result_id: Optional[int] = None
    review_id: Optional[int] = None
    original_plate: str
    corrected_plate: str
    original_ocr_candidates_json: Optional[str] = None
    detector_confidence: Optional[str] = None
    ocr_confidence: Optional[str] = None
    quality_level: Optional[str] = None
    quality_hints_json: Optional[str] = None
    operator_action: Optional[str] = None
    operator_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ReportExportRequest(BaseModel):
    export_type: str = "csv"
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    area: Optional[str] = None
    gate_no: Optional[str] = None
    direction: Optional[str] = None
    operator_id: Optional[str] = None

class ReportExportJobResponse(BaseModel):
    id: int
    export_type: str
    filters_json: Optional[str] = None
    status: str
    result_path: Optional[str] = None
    total_rows: int
    operator_id: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AnalyticsSummary(BaseModel):
    total_entries: int = 0
    total_exits: int = 0
    unique_vehicles: int = 0
    avg_stay_minutes: Optional[float] = None
    overstay_count: int = 0
    manual_entries: int = 0
    scan_entries: int = 0
    whitelist_hits: int = 0
    correction_rate: Optional[float] = None
    top_repeat_vehicles: List[dict] = Field(default_factory=list)
    daily_breakdown: List[dict] = Field(default_factory=list)

class PlanPolicyCheck(BaseModel):
    feature: str
    allowed: bool
    plan_tier: str
    message: Optional[str] = None
