import os
import threading
import time

import cv2
from fastapi import HTTPException

from .. import ai_engine, schemas

local_ai = None
ai_engine_loading = False
ai_engine_error = None
ai_engine_lock = threading.Lock()


def init_local_ai():
    global local_ai, ai_engine_loading, ai_engine_error
    with ai_engine_lock:
        if local_ai is not None or ai_engine_loading:
            return
        ai_engine_loading = True
        ai_engine_error = None

    try:
        print("Initializing Local AI Engine (YOLO + OCR)...")
        engine = ai_engine.get_ai_engine()
        local_ai = engine
        print("Local AI Engine Ready.")
    except Exception as exc:
        ai_engine_error = str(exc)
        print(f"Local AI Engine failed to initialize: {ai_engine_error}")
    finally:
        ai_engine_loading = False


def warmup_async() -> None:
    threading.Thread(target=init_local_ai, daemon=True).start()


def get_health_status() -> dict:
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "local_ai_loaded": local_ai is not None,
        "ai_engine_loading": ai_engine_loading,
        "ai_engine_error": ai_engine_error,
        "mode": "100% Offline / Local",
    }


def _map_scan_results(results, provider: str, start_time: float) -> schemas.ScanResponse:
    vehicles = []
    for result in results:
        vehicles.append(
            schemas.PlateDetection(
                plate_number=result["plate_number"],
                direction=result["direction"],
                tagging=result["tagging"],
                vehicle_type=result["vehicle_type"],
            )
        )

    return schemas.ScanResponse(
        vehicles=vehicles,
        detection_time=str(time.time() - start_time),
        provider=provider,
    )


def scan_base64_image(image_base64: str) -> schemas.ScanResponse:
    if local_ai is None and not ai_engine_loading:
        warmup_async()

    if local_ai is None:
        raise HTTPException(
            status_code=503,
            detail="AI Engine is still loading models. Please wait a moment.",
        )

    try:
        start_time = time.time()
        results = local_ai.process_image(image_base64)
        return _map_scan_results(results, "GATIQ-Local-AI (YOLOv8+EasyOCR)", start_time)
    except Exception as exc:
        print(f"Scanning failed: {str(exc)}")
        raise HTTPException(status_code=500, detail=f"Local Scanning failed: {str(exc)}") from exc


def grab_cctv_frame(rtsp_url: str):
    os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;udp"
    cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
    cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 3000)

    if not cap.isOpened():
        raise RuntimeError(
            f"Could not open RTSP stream: {rtsp_url}. Check if camera is online and credentials are correct."
        )

    success = False
    frame = None
    for _ in range(5):
        success, frame = cap.read()

    cap.release()

    if not success or frame is None:
        raise RuntimeError("Connected to CCTV but failed to grab a valid image frame.")

    return frame


def scan_cctv_stream(rtsp_url: str) -> schemas.ScanResponse:
    if local_ai is None:
        raise HTTPException(
            status_code=503,
            detail="AI Engine is still loading models. Please wait a moment.",
        )

    try:
        start_time = time.time()
        frame = grab_cctv_frame(rtsp_url)
        results = local_ai._process_core(frame)
        return _map_scan_results(results, "GATIQ-Local-AI (CCTV RTSP Mode)", start_time)
    except HTTPException:
        raise
    except Exception as exc:
        print(f"CCTV Scanning failed: {str(exc)}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
