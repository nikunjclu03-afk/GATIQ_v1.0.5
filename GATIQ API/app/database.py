import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker


def resolve_database_url() -> str:
    data_dir = Path(os.getenv("GATIQ_DATA_DIR", Path(__file__).resolve().parents[1] / "data"))
    data_dir.mkdir(parents=True, exist_ok=True)
    database_path = data_dir / "gatiq_local.db"
    return f"sqlite:///{database_path.as_posix()}"


SQLALCHEMY_DATABASE_URL = resolve_database_url()

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
