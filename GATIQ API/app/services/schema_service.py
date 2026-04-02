from sqlalchemy import inspect, text

from .. import database


def _column_names(inspector, table_name: str) -> set[str]:
    try:
        return {column["name"] for column in inspector.get_columns(table_name)}
    except Exception:
        return set()


def ensure_normalized_schema() -> None:
    inspector = inspect(database.engine)
    with database.engine.begin() as connection:
        existing_tables = set(inspector.get_table_names())

        create_statements = {
            "sites": """
                CREATE TABLE IF NOT EXISTS sites (
                    id INTEGER PRIMARY KEY,
                    name VARCHAR,
                    code VARCHAR,
                    area_label VARCHAR,
                    created_at DATETIME
                )
            """,
            "gates": """
                CREATE TABLE IF NOT EXISTS gates (
                    id INTEGER PRIMARY KEY,
                    site_id INTEGER,
                    name VARCHAR,
                    code VARCHAR,
                    created_at DATETIME
                )
            """,
            "devices": """
                CREATE TABLE IF NOT EXISTS devices (
                    id INTEGER PRIMARY KEY,
                    site_id INTEGER,
                    gate_id INTEGER,
                    device_uid VARCHAR,
                    label VARCHAR,
                    device_type VARCHAR,
                    created_at DATETIME
                )
            """,
            "users": """
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY,
                    external_uid VARCHAR,
                    name VARCHAR,
                    email VARCHAR,
                    role VARCHAR,
                    created_at DATETIME
                )
            """,
            "scan_results": """
                CREATE TABLE IF NOT EXISTS scan_results (
                    id INTEGER PRIMARY KEY,
                    scan_job_id VARCHAR,
                    site_id INTEGER,
                    gate_id INTEGER,
                    detected_plate VARCHAR,
                    direction VARCHAR,
                    tagging VARCHAR,
                    vehicle_type VARCHAR,
                    raw_payload_json TEXT,
                    created_log_id INTEGER,
                    created_at DATETIME
                )
            """,
            "sync_events": """
                CREATE TABLE IF NOT EXISTS sync_events (
                    id INTEGER PRIMARY KEY,
                    sync_run_id INTEGER,
                    outbox_id INTEGER,
                    aggregate_type VARCHAR,
                    aggregate_id VARCHAR,
                    event_type VARCHAR,
                    payload_json TEXT,
                    created_at DATETIME
                )
            """,
        }

        for table_name, statement in create_statements.items():
            if table_name not in existing_tables:
                connection.execute(text(statement))

        # ─── Phase 1: New tables ───
        phase1_tables = {
            "scan_reviews": """
                CREATE TABLE IF NOT EXISTS scan_reviews (
                    id INTEGER PRIMARY KEY,
                    scan_job_id VARCHAR,
                    scan_result_id INTEGER,
                    site_id INTEGER,
                    gate_id INTEGER,
                    device_id INTEGER,
                    user_id INTEGER,
                    detected_plate VARCHAR,
                    corrected_plate VARCHAR,
                    direction VARCHAR,
                    tagging VARCHAR,
                    vehicle_type VARCHAR,
                    purpose VARCHAR,
                    area VARCHAR,
                    gate_no VARCHAR,
                    detector_confidence VARCHAR,
                    ocr_confidence VARCHAR,
                    quality_level VARCHAR,
                    quality_hints_json TEXT,
                    failure_reason VARCHAR,
                    status VARCHAR DEFAULT 'pending_review',
                    reviewed_by INTEGER,
                    reviewed_at DATETIME,
                    review_note TEXT,
                    created_log_id INTEGER,
                    duplicate_flags_json TEXT,
                    vehicle_capacity VARCHAR,
                    dock_no VARCHAR,
                    consignment_no VARCHAR,
                    driver_name VARCHAR,
                    driver_phone VARCHAR,
                    status_label VARCHAR,
                    operator_name VARCHAR,
                    created_at DATETIME
                )
            """,
            "camera_health": """
                CREATE TABLE IF NOT EXISTS camera_health (
                    id INTEGER PRIMARY KEY,
                    source_id VARCHAR UNIQUE,
                    source_type VARCHAR DEFAULT 'rtsp',
                    label VARCHAR,
                    site_id INTEGER,
                    gate_id INTEGER,
                    is_online BOOLEAN DEFAULT 0,
                    last_success_at DATETIME,
                    last_frame_at DATETIME,
                    last_error TEXT,
                    restart_supported BOOLEAN DEFAULT 1,
                    consecutive_failures INTEGER DEFAULT 0,
                    created_at DATETIME,
                    updated_at DATETIME
                )
            """,
            "vehicle_visits": """
                CREATE TABLE IF NOT EXISTS vehicle_visits (
                    id INTEGER PRIMARY KEY,
                    site_id INTEGER,
                    normalized_plate VARCHAR,
                    entry_log_id INTEGER,
                    exit_log_id INTEGER,
                    entry_at DATETIME,
                    exit_at DATETIME,
                    is_open BOOLEAN DEFAULT 1,
                    stay_duration_minutes INTEGER,
                    area VARCHAR,
                    gate_no VARCHAR,
                    vehicle_type VARCHAR,
                    tagging VARCHAR,
                    source_type VARCHAR,
                    review_status VARCHAR,
                    created_at DATETIME
                )
            """,
        }

        for table_name, statement in phase1_tables.items():
            if table_name not in existing_tables:
                connection.execute(text(statement))

        # ─── Phase 2: Controls, Audit, Deployment ───
        phase2_tables = {
            "audit_events": """
                CREATE TABLE IF NOT EXISTS audit_events (
                    id INTEGER PRIMARY KEY,
                    actor_id VARCHAR,
                    actor_name VARCHAR,
                    action VARCHAR,
                    entity_type VARCHAR,
                    entity_id VARCHAR,
                    old_values_json TEXT,
                    new_values_json TEXT,
                    reason VARCHAR,
                    created_at DATETIME
                )
            """,
            "incident_records": """
                CREATE TABLE IF NOT EXISTS incident_records (
                    id INTEGER PRIMARY KEY,
                    log_id INTEGER,
                    review_id INTEGER,
                    reporter_id VARCHAR,
                    severity_flag VARCHAR,
                    note TEXT,
                    media_path VARCHAR,
                    status VARCHAR DEFAULT 'open',
                    created_at DATETIME,
                    resolved_at DATETIME,
                    resolver_id VARCHAR
                )
            """,
            "whitelist_import_jobs": """
                CREATE TABLE IF NOT EXISTS whitelist_import_jobs (
                    id INTEGER PRIMARY KEY,
                    filename VARCHAR,
                    operator_id VARCHAR,
                    status VARCHAR DEFAULT 'pending',
                    total_rows INTEGER DEFAULT 0,
                    success_count INTEGER DEFAULT 0,
                    error_count INTEGER DEFAULT 0,
                    error_details_json TEXT,
                    created_at DATETIME,
                    completed_at DATETIME
                )
            """,
            "plan_entitlements": """
                CREATE TABLE IF NOT EXISTS plan_entitlements (
                    id INTEGER PRIMARY KEY,
                    plan_tier VARCHAR UNIQUE,
                    max_cameras INTEGER DEFAULT 1,
                    retention_days INTEGER DEFAULT 30,
                    features_json TEXT,
                    created_at DATETIME
                )
            """
        }

        for table_name, statement in phase2_tables.items():
            if table_name not in existing_tables:
                connection.execute(text(statement))

        # ─── Phase 3: Commercial & Reporting Readiness ───
        phase3_tables = {
            "correction_feedback": """
                CREATE TABLE IF NOT EXISTS correction_feedback (
                    id INTEGER PRIMARY KEY,
                    scan_result_id INTEGER,
                    review_id INTEGER,
                    original_plate VARCHAR,
                    corrected_plate VARCHAR,
                    original_ocr_candidates_json TEXT,
                    detector_confidence VARCHAR,
                    ocr_confidence VARCHAR,
                    quality_level VARCHAR,
                    quality_hints_json TEXT,
                    operator_action VARCHAR,
                    operator_id VARCHAR,
                    created_at DATETIME
                )
            """,
            "report_export_jobs": """
                CREATE TABLE IF NOT EXISTS report_export_jobs (
                    id INTEGER PRIMARY KEY,
                    export_type VARCHAR DEFAULT 'csv',
                    filters_json TEXT,
                    status VARCHAR DEFAULT 'pending',
                    result_path VARCHAR,
                    total_rows INTEGER DEFAULT 0,
                    operator_id VARCHAR,
                    created_at DATETIME,
                    completed_at DATETIME
                )
            """
        }

        for table_name, statement in phase3_tables.items():
            if table_name not in existing_tables:
                connection.execute(text(statement))

        inspector = inspect(database.engine)
        alter_map = {
            "logs": [
                ("site_id", "ALTER TABLE logs ADD COLUMN site_id INTEGER"),
                ("gate_id", "ALTER TABLE logs ADD COLUMN gate_id INTEGER"),
                ("device_id", "ALTER TABLE logs ADD COLUMN device_id INTEGER"),
                ("user_id", "ALTER TABLE logs ADD COLUMN user_id INTEGER"),
            ],
            "reports": [
                ("site_id", "ALTER TABLE reports ADD COLUMN site_id INTEGER"),
                ("gate_id", "ALTER TABLE reports ADD COLUMN gate_id INTEGER"),
                ("device_id", "ALTER TABLE reports ADD COLUMN device_id INTEGER"),
                ("user_id", "ALTER TABLE reports ADD COLUMN user_id INTEGER"),
                ("synced_at", "ALTER TABLE reports ADD COLUMN synced_at DATETIME"),
            ],
            "scan_jobs": [
                ("site_id", "ALTER TABLE scan_jobs ADD COLUMN site_id INTEGER"),
                ("gate_id", "ALTER TABLE scan_jobs ADD COLUMN gate_id INTEGER"),
                ("device_row_id", "ALTER TABLE scan_jobs ADD COLUMN device_row_id INTEGER"),
                ("user_id", "ALTER TABLE scan_jobs ADD COLUMN user_id INTEGER"),
            ],
            "report_jobs": [
                ("site_id", "ALTER TABLE report_jobs ADD COLUMN site_id INTEGER"),
                ("gate_id", "ALTER TABLE report_jobs ADD COLUMN gate_id INTEGER"),
                ("device_id", "ALTER TABLE report_jobs ADD COLUMN device_id INTEGER"),
                ("user_id", "ALTER TABLE report_jobs ADD COLUMN user_id INTEGER"),
            ],
            "sync_runs": [
                ("failed_count", "ALTER TABLE sync_runs ADD COLUMN failed_count INTEGER DEFAULT 0"),
                ("last_error", "ALTER TABLE sync_runs ADD COLUMN last_error TEXT"),
            ],
            # Phase 1: new columns on scan_results
            "scan_results": [
                ("detector_confidence", "ALTER TABLE scan_results ADD COLUMN detector_confidence VARCHAR"),
                ("ocr_confidence", "ALTER TABLE scan_results ADD COLUMN ocr_confidence VARCHAR"),
                ("quality_level", "ALTER TABLE scan_results ADD COLUMN quality_level VARCHAR"),
                ("quality_hints_json", "ALTER TABLE scan_results ADD COLUMN quality_hints_json TEXT"),
                ("best_frame_index", "ALTER TABLE scan_results ADD COLUMN best_frame_index INTEGER"),
                ("failure_reason", "ALTER TABLE scan_results ADD COLUMN failure_reason VARCHAR"),
                ("review_required", "ALTER TABLE scan_results ADD COLUMN review_required BOOLEAN DEFAULT 0"),
                ("review_id", "ALTER TABLE scan_results ADD COLUMN review_id INTEGER"),
            ],
        }

        for table_name, operations in alter_map.items():
            if table_name not in inspector.get_table_names():
                continue
            columns = _column_names(inspector, table_name)
            for column_name, statement in operations:
                if column_name not in columns:
                    connection.execute(text(statement))
