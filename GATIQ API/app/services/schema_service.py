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
        }

        for table_name, operations in alter_map.items():
            columns = _column_names(inspector, table_name)
            for column_name, statement in operations:
                if column_name not in columns:
                    connection.execute(text(statement))
