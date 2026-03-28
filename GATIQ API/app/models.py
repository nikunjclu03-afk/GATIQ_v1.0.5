import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text

from .database import Base


class VehicleLog(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True)
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
    name = Column(String)
    area = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    file_path = Column(String, nullable=True)
    entry_count = Column(Integer, default=0)


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


class ReportJob(Base):
    __tablename__ = "report_jobs"

    job_id = Column(String, primary_key=True, index=True)
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
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
