from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader

from . import database
from .core.config import API_KEY_NAME, GATIQ_API_KEY


api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=True)


def get_api_key(api_key: str = Depends(api_key_header)) -> str:
    if api_key != GATIQ_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid GATIQ API Key",
        )
    return api_key


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()
