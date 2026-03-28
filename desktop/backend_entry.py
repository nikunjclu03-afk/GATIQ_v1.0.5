import os
import sys
from pathlib import Path

# CRITICAL: For frozen builds, add _internal to PATH and DLL search dirs
# so that native extensions like cv2.pyd can find their dependent DLLs
if getattr(sys, "frozen", False):
    _internal = Path(sys.executable).resolve().parent / "_internal"
    _cv2_internal = _internal / "cv2"
    _exe_dir = Path(sys.executable).resolve().parent
    
    # Add _internal to sys.path so bundled packages are found
    if _internal.is_dir() and str(_internal) not in sys.path:
        sys.path.insert(0, str(_internal))
        
    _dll_dirs = [p for p in (_internal, _cv2_internal, _exe_dir) if p.is_dir()]
    if _dll_dirs:
        os.environ["PATH"] = os.pathsep.join(str(p) for p in _dll_dirs) + os.pathsep + os.environ.get("PATH", "")
        for dll_dir in _dll_dirs:
            try:
                os.add_dll_directory(str(dll_dir))
            except (OSError, AttributeError):
                pass

import uvicorn
# Ensure FastAPI is seen by PyInstaller analyzer
try:
    import fastapi
except ImportError:
    pass


def resolve_backend_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parents[1] / "GATIQ API"


def configure_paths() -> Path:
    backend_root = resolve_backend_root()
    # In frozen mode, _internal is already added to sys.path above.
    # In dev mode, we need the API root.
    if not getattr(sys, "frozen", False):
        if str(backend_root) not in sys.path:
            sys.path.insert(0, str(backend_root))

    env_file = backend_root / ".env"
    os.environ.setdefault("GATIQ_ENV_FILE", str(env_file))
    os.environ.setdefault("GATIQ_MODEL_DIR", str(backend_root))
    os.environ.setdefault("EASYOCR_MODULE_PATH", str(backend_root / "easyocr_models"))
    return backend_root


def main() -> None:
    configure_paths()
    host = os.getenv("GATIQ_HOST", "127.0.0.1")
    port = int(os.getenv("GATIQ_PORT", "8001"))
    # The string "app.main:app" will resolve if 'app' is in sys.path (via _internal)
    uvicorn.run("app.main:app", host=host, port=port, access_log=False)


if __name__ == "__main__":
    main()
