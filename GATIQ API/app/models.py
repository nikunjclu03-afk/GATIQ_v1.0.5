import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text

from .database import Base


class Site(Base):
    __tablename__ = "sites"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    code = Column(String, nullable=True, index=True)
    area_label = Column(String, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Gate(Base):
    __tablename__ = "gates"

    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, nullable=True, index=True)
    name = Column(String, index=True)
    code = Column(String, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, nullable=True, index=True)
    gate_id = Column(Integer, nullable=True, index=True)
    device_uid = Column(String, unique=True, index=True)
    label = Column(String, nullable=True)
    device_type = Column(String, default="desktop")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class AppUser(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    external_uid = Column(String, nullable=True, index=True)
    name = Column(String, index=True)
    email = Column(String, nullable=True, index=True)
    role = Column(String, default="operator", index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class VehicleLog(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, nullable=True, index=True)
    gate_id = Column(Integer, nullable=True, index=True)
    device_id = Column(Integer, nullable=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    vehicle_no = Column(String, index=True)
    vehicle_type = Column(String)
    gate_no = Column(String)
    area = Column(String)
    entry_exit = Column(String)
    purpose = Column(String)
    tagging = Column(String)
    vehicle_capacity = Column(String, nullable=True)
    dock_no = Column(String, nullable=True)
    consignment_no = Column(String, nullable=True)
    driver_name = Column(String, nullable=True)
    driver_phone = Column(String, nullable=True)
    status = Column(String)
    is_synced = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)


class Whitelist(Base):
    __tablename__ = "whitelist"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_no = Column(String, unique=True, index=True)
    owner_name = Column(String)
    flat_no = Column(String, nullable=True)
    contact = Column(String, nullable=True)
    category = Column(String)
    status = Column(String, default="Active")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class PDFReport(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, index=True)
    site_id = Column(Integer, nullable=True, index=True)
    gate_id = Column(Integer, nullable=True, index=True)
    device_id = Column(Integer, nullable=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    name = Column(String)
    area = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    file_path = Column(String, nullable=True)
    entry_count = Column(Integer, default=0)
    synced_at = Column(DateTime, nullable=True)


class EventJournal(Base):
    __tablename__ = "event_journal"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String, index=True)
    aggregate_type = Column(String, index=True)
    aggregate_id = Column(String, index=True)
    job_id = Column(String, index=True, nullable=True)
    correlation_id = Column(String, index=True, nullable=True)
    payload_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)


class JobQueue(Base):
    __tablename__ = "job_queue"

    job_id = Column(String, primary_key=True, index=True)
    job_type = Column(String, index=True)
    status = Column(String, index=True)
    priority = Column(Integer, default=100)
    payload_json = Column(Text, nullable=True)
    result_json = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    attempt_count = Column(Integer, default=0)
    max_attempts = Column(Integer, default=3)
    dedupe_key = Column(String, index=True, nullable=True)
    correlation_id = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    lease_expires_at = Column(DateTime, nullable=True, index=True)


class ScanJob(Base):
    __tablename__ = "scan_jobs"

    job_id = Column(String, primary_key=True, index=True)
    site_id = Column(Integer, nullable=True, index=True)
    gate_id = Column(Integer, nullable=True, index=True)
    device_row_id = Column(Integer, nullable=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    source = Column(String, index=True)
    area = Column(String, index=True)
    gate_no = Column(String, nullable=True)
    facility_name = Column(String, nullable=True)
    purpose = Column(String, nullable=True)
    tagging = Column(String, nullable=True)
    vehicle_type = Column(String, nullable=True)
    vehicle_capacity = Column(String, nullable=True)
    dock_no = Column(String, nullable=True)
    consignment_no = Column(String, nullable=True)
    driver_name = Column(String, nullable=True)
    driver_phone = Column(String, nullable=True)
    status_label = Column(String, nullable=True)
    image_base64 = Column(Text, nullable=True)
    rtsp_url = Column(Text, nullable=True)
    detection_summary = Column(Text, nullable=True)
    created_log_ids = Column(Text, nullable=True)
    report_job_ids = Column(Text, nullable=True)
    operator_name = Column(String, nullable=True)
    device_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class ScanResult(Base):
    __tablename__ = "scan_results"

    id = Column(Integer, primary_key=True, index=True)
    scan_job_id = Column(String, index=True)
    site_id = Column(Integer, nullable=True, index=True)
    gate_id = Column(Integer, nullable=True, index=True)
    detected_plate = Column(String, index=True)
    direction = Column(String, nullable=True)
    tagging = Column(String, nullable=True)
    vehicle_type = Column(String, nullable=True)
    raw_payload_json = Column(Text, nullable=True)
    created_log_id = Column(Integer, nullable=True, index=True)
    # Phase 1: Confidence & quality fields
    detector_confidence = Column(String, nullable=True)
    ocr_confidence = Column(String, nullable=True)
    quality_level = Column(String, nullable=True)  # good, fair, poor
    quality_hints_json = Column(Text, nullable=True)  # JSON array: ["blurred","low_light",...]
    best_frame_index = Column(Integer, nullable=True)
    failure_reason = Column(String, nullable=True)
    review_required = Column(Boolean, default=False)
    review_id = Column(Integer, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class ReportJob(Base):
    __tablename__ = "report_jobs"

    job_id = Column(String, primary_key=True, index=True)
    site_id = Column(Integer, nullable=True, index=True)
    gate_id = Column(Integer, nullable=True, index=True)
    device_id = Column(Integer, nullable=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    report_id = Column(String, index=True)
    name = Column(String)
    area = Column(String, index=True)
    gate_no = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    entry_count = Column(Integer, default=0)
    snapshot_json = Column(Text, nullable=True)
    result_report_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class SyncRun(Base):
    __tablename__ = "sync_runs"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String, index=True)
    area = Column(String, nullable=True, index=True)
    status = Column(String, index=True)
    synced_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)


class SyncOutbox(Base):
    __tablename__ = "sync_outbox"

    id = Column(Integer, primary_key=True, index=True)
    aggregate_type = Column(String, index=True)
    aggregate_id = Column(String, index=True)
    operation = Column(String, default="upsert", index=True)
    status = Column(String, default="pending", index=True)
    payload_json = Column(Text, nullable=False)
    dedupe_key = Column(String, index=True)
    attempt_count = Column(Integer, default=0)
    max_attempts = Column(Integer, default=5)
    next_attempt_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    last_attempt_at = Column(DateTime, nullable=True)
    last_error = Column(Text, nullable=True)
    locked_at = Column(DateTime, nullable=True, index=True)
    synced_at = Column(DateTime, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class SyncEvent(Base):
    __tablename__ = "sync_events"

    id = Column(Integer, primary_key=True, index=True)
    sync_run_id = Column(Integer, nullable=True, index=True)
    outbox_id = Column(Integer, nullable=True, index=True)
    aggregate_type = Column(String, index=True)
    aggregate_id = Column(String, index=True)
    event_type = Column(String, index=True)
    payload_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)


# ─── Phase 1: Gate Ops Core Models ───────────────────────────────────

class ScanReview(Base):
    __tablename__ = "scan_reviews"

    id = Column(Integer, primary_key=True, index=True)
    scan_job_id = Column(String, index=True)
    scan_result_id = Column(Integer, nullable=True, index=True)
    site_id = Column(Integer, nullable=True, index=True)
    gate_id = Column(Integer, nullable=True, index=True)
    device_id = Column(Integer, nullable=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    detected_plate = Column(String, index=True)
    corrected_plate = Column(String, nullable=True, index=True)
    direction = Column(String, nullable=True)
    tagging = Column(String, nullable=True)
    vehicle_type = Column(String, nullable=True)
    purpose = Column(String, nullable=True)
    area = Column(String, nullable=True, index=True)
    gate_no = Column(String, nullable=True)
    # Confidence / quality
    detector_confidence = Column(String, nullable=True)
    ocr_confidence = Column(String, nullable=True)
    quality_level = Column(String, nullable=True)
    quality_hints_json = Column(Text, nullable=True)
    failure_reason = Column(String, nullable=True)
    # Review state: pending_review | confirmed | rejected | unreadable
    status = Column(String, default="pending_review", index=True)
    reviewed_by = Column(Integer, nullable=True, index=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_note = Column(Text, nullable=True)
    created_log_id = Column(Integer, nullable=True, index=True)
    # Duplicate detection flags
    duplicate_flags_json = Column(Text, nullable=True)
    # Extra scan job fields
    vehicle_capacity = Column(String, nullable=True)
    dock_no = Column(String, nullable=True)
    consignment_no = Column(String, nullable=True)
    driver_name = Column(String, nullable=True)
    driver_phone = Column(String, nullable=True)
    status_label = Column(String, nullable=True)
    operator_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)


class CameraHealth(Base):
    __tablename__ = "camera_health"

    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(String, unique=True, index=True)  # e.g. "rtsp://..." or "webcam-0"
    source_type = Column(String, default="rtsp")  # rtsp | webcam
    label = Column(String, nullable=True)
    site_id = Column(Integer, nullable=True, index=True)
    gate_id = Column(Integer, nullable=True, index=True)
    # Health snapshot
    is_online = Column(Boolean, default=False)
    last_success_at = Column(DateTime, nullable=True)
    last_frame_at = Column(DateTime, nullable=True)
    last_error = Column(Text, nullable=True)
    restart_supported = Column(Boolean, default=True)
    consecutive_failures = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class VehicleVisit(Base):
    __tablename__ = "vehicle_visits"

    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, nullable=True, index=True)
    normalized_plate = Column(String, index=True)
    entry_log_id = Column(Integer, nullable=True, index=True)
    exit_log_id = Column(Integer, nullable=True, index=True)
    entry_at = Column(DateTime, nullable=True, index=True)
    exit_at = Column(DateTime, nullable=True)
    is_open = Column(Boolean, default=True, index=True)
    stay_duration_minutes = Column(Integer, nullable=True)
    area = Column(String, nullable=True, index=True)
    gate_no = Column(String, nullable=True)
    vehicle_type = Column(String, nullable=True)
    tagging = Column(String, nullable=True)
    source_type = Column(String, nullable=True)  # scan | manual
    review_status = Column(String, nullable=True)  # confirmed | rejected | null
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(String, index=True)
    actor_name = Column(String, nullable=True)
    action = Column(String, index=True) 
    entity_type = Column(String, index=True) 
    entity_id = Column(String, index=True)
    old_values_json = Column(Text, nullable=True)
    new_values_json = Column(Text, nullable=True)
    reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)


class IncidentRecord(Base):
    __tablename__ = "incident_records"

    id = Column(Integer, primary_key=True, index=True)
    log_id = Column(Integer, nullable=True, index=True)
    review_id = Column(Integer, nullable=True, index=True)
    reporter_id = Column(String, index=True)
    severity_flag = Column(String, index=True)
    note = Column(Text, nullable=True)
    media_path = Column(String, nullable=True)
    status = Column(String, default="open", index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    resolved_at = Column(DateTime, nullable=True)
    resolver_id = Column(String, nullable=True)


class WhitelistImportJob(Base):
    __tablename__ = "whitelist_import_jobs"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    operator_id = Column(String, index=True)
    status = Column(String, default="pending", index=True)
    total_rows = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    error_details_json = Column(Text, nullable=True) 
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


class PlanEntitlement(Base):
    __tablename__ = "plan_entitlements"

    id = Column(Integer, primary_key=True, index=True)
    plan_tier = Column(String, unique=True, index=True)
    max_cameras = Column(Integer, default=1)
    retention_days = Column(Integer, default=30)
    features_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
