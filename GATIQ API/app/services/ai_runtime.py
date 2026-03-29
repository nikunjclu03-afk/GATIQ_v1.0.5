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


def _map_scan_results(results, provider: str, start_time: float, diagnostics=None) -> schemas.ScanResponse:
    vehicles = []
    plate_diags = diagnostics.get("plate_diagnostics", []) if diagnostics else []

    for i, result in enumerate(results):
        plate = result.get("plate_number", "UNREADABLE")
        diag = plate_diags[i] if i < len(plate_diags) else {}

        det_conf = diag.get("detector_confidence")
        best_cand = diag.get("accepted_candidate") or {}
        ocr_conf = best_cand.get("score", 0) / 100.0 if best_cand else None

        # Determine quality level
        quality_level = "good"
        quality_hints = []
        if det_conf is not None and det_conf < 0.5:
            quality_level = "poor"
            quality_hints.append("low_detection_confidence")
        elif det_conf is not None and det_conf < 0.7:
            quality_level = "fair"

        if ocr_conf is not None and ocr_conf < 0.3:
            quality_level = "poor"
            quality_hints.append("low_ocr_confidence")
        elif ocr_conf is not None and ocr_conf < 0.6:
            if quality_level != "poor":
                quality_level = "fair"
            quality_hints.append("uncertain_ocr")

        if plate == "UNREADABLE":
            quality_level = "poor"
            quality_hints.append("unreadable_plate")

        failure_reason = None
        if plate == "UNREADABLE":
            if diagnostics and diagnostics.get("fallback_used"):
                failure_reason = "no_plate_detected"
            elif det_conf is not None and det_conf < 0.3:
                failure_reason = "low_confidence_detection"
            else:
                failure_reason = "ocr_failed"

        review_required = (
            plate == "UNREADABLE"
            or quality_level in ("poor", "fair")
            or (ocr_conf is not None and ocr_conf < 0.6)
        )

        vehicles.append(
            schemas.PlateDetection(
                plate_number=plate,
                direction=result.get("direction", "Entry"),
                tagging=result.get("tagging", ""),
                vehicle_type=result.get("vehicle_type", "Unknown"),
            )
        )

    return schemas.ScanResponse(
        vehicles=vehicles,
        detection_time=str(time.time() - start_time),
        provider=provider,
    )


def _map_scan_results_enriched(results, provider: str, start_time: float, diagnostics=None):
    """Return enriched detection data with confidence, quality hints, etc."""
    vehicles = []
    plate_diags = diagnostics.get("plate_diagnostics", []) if diagnostics else []

    for i, result in enumerate(results):
        plate = result.get("plate_number", "UNREADABLE")
        diag = plate_diags[i] if i < len(plate_diags) else {}

        det_conf = diag.get("detector_confidence")
        best_cand = diag.get("accepted_candidate") or {}
        ocr_score = best_cand.get("score", 0)
        ocr_conf = ocr_score / 100.0 if ocr_score else None
        candidates = diag.get("candidates", [])

        quality_level = "good"
        quality_hints = []
        if det_conf is not None and det_conf < 0.5:
            quality_level = "poor"
            quality_hints.append("low_detection_confidence")
        elif det_conf is not None and det_conf < 0.7:
            quality_level = "fair"

        if ocr_conf is not None and ocr_conf < 0.3:
            quality_level = "poor"
            quality_hints.append("low_ocr_confidence")
        elif ocr_conf is not None and ocr_conf < 0.6:
            if quality_level != "poor":
                quality_level = "fair"
            quality_hints.append("uncertain_ocr")

        if plate == "UNREADABLE":
            quality_level = "poor"
            quality_hints.append("unreadable_plate")

        failure_reason = None
        if plate == "UNREADABLE":
            if diagnostics and diagnostics.get("fallback_used"):
                failure_reason = "no_plate_detected"
            else:
                failure_reason = "ocr_failed"

        review_required = (
            plate == "UNREADABLE"
            or quality_level in ("poor", "fair")
            or (ocr_conf is not None and ocr_conf < 0.6)
        )

        vehicles.append(
            schemas.EnrichedPlateDetection(
                plate_number=plate,
                direction=result.get("direction", "Entry"),
                tagging=result.get("tagging", ""),
                vehicle_type=result.get("vehicle_type", "Unknown"),
                detector_confidence=round(det_conf, 4) if det_conf else None,
                ocr_confidence=round(ocr_conf, 4) if ocr_conf else None,
                quality_level=quality_level,
                quality_hints=quality_hints,
                failure_reason=failure_reason,
                review_required=review_required,
                candidates=candidates,
            )
        )

    return vehicles


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
        results, diagnostics = local_ai.process_image_detailed(image_base64)
        return _map_scan_results(results, "GATIQ-Local-AI (YOLOv8+EasyOCR)", start_time, diagnostics)
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
        results, diagnostics = local_ai._process_core(frame, include_diagnostics=True)
        return _map_scan_results(results, "GATIQ-Local-AI (CCTV RTSP Mode)", start_time, diagnostics)
    except HTTPException:
        raise
    except Exception as exc:
        print(f"CCTV Scanning failed: {str(exc)}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def scan_cctv_multi_frame(rtsp_url: str, num_frames: int = 3) -> schemas.ScanResponse:
    """Phase 1: Multi-frame best-shot scan for CCTV.
    Capture multiple frames, run detection on each, pick the best result."""
    if local_ai is None:
        raise HTTPException(
            status_code=503,
            detail="AI Engine is still loading models. Please wait a moment.",
        )

    try:
        start_time = time.time()
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;udp"
        cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
        cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 3000)

        if not cap.isOpened():
            from .camera_service import record_camera_failure
            try:
                from .. import database
                with database.SessionLocal() as db:
                    record_camera_failure(db, rtsp_url, f"Could not open RTSP stream: {rtsp_url}")
            except Exception:
                pass
            raise HTTPException(status_code=500, detail=f"Could not open RTSP stream: {rtsp_url}")

        frames = []
        for _ in range(num_frames + 5):  # Read extra to skip initial blank frames
            success, frame = cap.read()
            if success and frame is not None:
                frames.append(frame)
            if len(frames) >= num_frames:
                break
        cap.release()

        if not frames:
            from .camera_service import record_camera_failure
            try:
                from .. import database
                with database.SessionLocal() as db:
                    record_camera_failure(db, rtsp_url, "Failed to grab any frames")
            except Exception:
                pass
            raise HTTPException(status_code=500, detail="Connected but failed to grab frames.")

        # Process each frame and pick the best result
        best_results = None
        best_diagnostics = None
        best_score = -1
        best_frame_idx = 0

        for idx, frame in enumerate(frames):
            try:
                results, diagnostics = local_ai._process_core(frame, include_diagnostics=True)
                # Score: prioritize more plates detected + higher confidence
                score = 0
                for det in results:
                    pn = (det.get("plate_number") or "").strip()
                    if pn and pn != "UNREADABLE":
                        score += 10
                for pd in diagnostics.get("plate_diagnostics", []):
                    score += (pd.get("detector_confidence", 0) or 0) * 5
                if score > best_score:
                    best_score = score
                    best_results = results
                    best_diagnostics = diagnostics
                    best_frame_idx = idx
            except Exception:
                continue

        if best_results is None:
            best_results = []
            best_diagnostics = {}

        # Record camera health success
        try:
            from .camera_service import record_camera_success
            from .. import database
            with database.SessionLocal() as db:
                record_camera_success(db, rtsp_url)
        except Exception:
            pass

        response = _map_scan_results(
            best_results,
            f"GATIQ-Local-AI (CCTV Multi-Frame, best of {len(frames)})",
            start_time,
            best_diagnostics,
        )
        return response

    except HTTPException:
        raise
    except Exception as exc:
        print(f"CCTV Multi-Frame Scanning failed: {str(exc)}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
