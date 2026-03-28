import os
import sys
from pathlib import Path

import uvicorn


def main() -> None:
    backend_root = Path(__file__).resolve().parent
    if str(backend_root) not in sys.path:
        sys.path.insert(0, str(backend_root))

    os.environ.setdefault("GATIQ_ENV_FILE", str(backend_root / ".env"))
    os.environ.setdefault("GATIQ_MODEL_DIR", str(backend_root))
    os.environ.setdefault("EASYOCR_MODULE_PATH", str(backend_root / "easyocr_models"))

    host = os.getenv("GATIQ_HOST", "127.0.0.1")
    port = int(os.getenv("GATIQ_PORT", "8001"))
    uvicorn.run("app.main:app", host=host, port=port, access_log=False)


if __name__ == "__main__":
    main()
