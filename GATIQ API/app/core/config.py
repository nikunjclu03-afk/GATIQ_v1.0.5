import os

from dotenv import load_dotenv


ENV_FILE = os.getenv("GATIQ_ENV_FILE") or os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    ".env",
)
load_dotenv(ENV_FILE)

API_KEY_NAME = "X-API-Key"
API_TITLE = "GATIQ API"
API_VERSION = "3.0.0 (Local AI)"
SERVICE_VERSION = "3.0.0"
SERVICE_ENGINE = "Local-AI (YOLO+OCR)"
CORS_ORIGIN_REGEX = os.getenv(
    "GATIQ_CORS_ORIGIN_REGEX",
    r"^(null|file://.*|app://.*|http://127\.0\.0\.1(:\d+)?|http://localhost(:\d+)?)$",
)
GATIQ_API_KEY = os.getenv("GATIQ_API_KEY")


def ensure_required_config() -> None:
    if not GATIQ_API_KEY:
        raise RuntimeError("CRITICAL ERROR: GATIQ_API_KEY environment variable is not defined!")
