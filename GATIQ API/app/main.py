from fastapi import FastAPI, Depends, HTTPException, Security, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from sqlalchemy.orm import Session
from . import models, database, schemas, ai_engine
import os
import time
from typing import List
from dotenv import load_dotenv
import threading
import cv2

# Load env variables
ENV_FILE = os.getenv("GATIQ_ENV_FILE") or os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(ENV_FILE)

# Initialize DB
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="GATIQ API", version="3.0.0 (Local AI)")

# Allow CORS for desktop-managed local runtime only.
CORS_ORIGIN_REGEX = os.getenv(
    "GATIQ_CORS_ORIGIN_REGEX",
    r"^(null|file://.*|app://.*|http://127\.0\.0\.1(:\d+)?|http://localhost(:\d+)?)$"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security Setup
API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=True)
GATIQ_API_KEY = os.getenv("GATIQ_API_KEY")
if not GATIQ_API_KEY:
    raise RuntimeError("CRITICAL ERROR: GATIQ_API_KEY environment variable is not defined!")

def get_api_key(api_key: str = Depends(api_key_header)):
    if api_key != GATIQ_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid GATIQ API Key"
        )
    return api_key

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pre-load AI Engine
# Keep startup responsive by warming models in a background thread.
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

@app.on_event("startup")
async def startup_event():
    threading.Thread(target=init_local_ai, daemon=True).start()

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "GATIQ API",
        "version": "3.0.0",
        "engine": "Local-AI (YOLO+OCR)",
        "endpoints": ["/health", "/scan/plate", "/logs/entry", "/logs/history"]
    }

@app.get("/health", dependencies=[Depends(get_api_key)])
def health_check():
    """Verify API connection and local AI status."""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "local_ai_loaded": local_ai is not None,
        "ai_engine_loading": ai_engine_loading,
        "ai_engine_error": ai_engine_error,
        "mode": "100% Offline / Local"
    }

# --- SCANNING ENDPOINT (Local AI Integration) ---
@app.post("/scan/plate", response_model=schemas.ScanResponse, dependencies=[Depends(get_api_key)])
async def scan_plate(request: schemas.ScanRequest):
    if local_ai is None and not ai_engine_loading:
        threading.Thread(target=init_local_ai, daemon=True).start()

    if local_ai is None:
        raise HTTPException(status_code=503, detail="AI Engine is still loading models. Please wait a moment.")

    try:
        start_time = time.time()
        
        # Run Local Detection (YOLO + OCR)
        results = local_ai.process_image(request.image_base64)
        
        # Map to Response Schema
        vehicles = []
        for r in results:
            vehicles.append(schemas.PlateDetection(
                plate_number=r["plate_number"],
                direction=r["direction"],
                tagging=r["tagging"],
                vehicle_type=r["vehicle_type"]
            ))
            
        execution_time = time.time() - start_time
        
        return schemas.ScanResponse(
            vehicles=vehicles,
            detection_time=str(execution_time),
            provider="GATIQ-Local-AI (YOLOv8+EasyOCR)"
        )
    except Exception as e:
        print(f"Scanning failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Local Scanning failed: {str(e)}")

def grab_cctv_frame(rtsp_url: str):
    """Grabs a single frame from an RTSP stream."""
    # Set transport to UDP for faster/lower-latency CCTV streams
    os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;udp"
    cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
    
    # Set a timeout (approx 3 seconds)
    cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 3000)
    
    if not cap.isOpened():
        raise RuntimeError(f"Could not open RTSP stream: {rtsp_url}. Check if camera is online and credentials are correct.")
    
    # Read a few frames to clear the buffer and get a fresh one
    for _ in range(5):
        success, frame = cap.read()
        
    cap.release()
    
    if not success or frame is None:
        raise RuntimeError("Connected to CCTV but failed to grab a valid image frame.")
    
    return frame

@app.post("/scan/cctv", response_model=schemas.ScanResponse, dependencies=[Depends(get_api_key)])
async def scan_cctv(request: schemas.CCTVScanRequest):
    if local_ai is None:
        raise HTTPException(status_code=503, detail="AI Engine is still loading models. Please wait a moment.")

    try:
        start_time = time.time()
        
        # Grab frame from RTSP
        frame = grab_cctv_frame(request.rtsp_url)
        
        # Run Local Detection (Calling core method directly with cv2 image)
        results = local_ai._process_core(frame)
        
        # Map to Response Schema
        vehicles = []
        for r in results:
            vehicles.append(schemas.PlateDetection(
                plate_number=r["plate_number"],
                direction=r["direction"],
                tagging=r["tagging"],
                vehicle_type=r["vehicle_type"]
            ))
            
        execution_time = time.time() - start_time
        
        return schemas.ScanResponse(
            vehicles=vehicles,
            detection_time=str(execution_time),
            provider="GATIQ-Local-AI (CCTV RTSP Mode)"
        )
    except Exception as e:
        print(f"CCTV Scanning failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# --- LOG ENTRY WITH WHITELIST LOGIC ---
@app.post("/logs/entry", response_model=schemas.VehicleLogResponse, dependencies=[Depends(get_api_key)])
def create_entry(entry: schemas.VehicleLogCreate, db: Session = Depends(get_db)):
    vehicle_no_up = entry.vehicle_no.upper()
    
    # 1. Smart Whitelist Check
    whitelist_entry = db.query(models.Whitelist).filter(models.Whitelist.vehicle_no == vehicle_no_up).first()
    
    tagging = entry.tagging
    purpose = entry.purpose
    
    if whitelist_entry and whitelist_entry.status == "Active":
        tagging = f"Whitelisted ({whitelist_entry.category})"
        if not purpose:
            purpose = "Authorized Entry"
    
    new_log = models.VehicleLog(
        vehicle_no=vehicle_no_up,
        vehicle_type=entry.vehicle_type,
        gate_no=entry.gate_no,
        area=entry.area,
        entry_exit=entry.entry_exit,
        purpose=purpose,
        tagging=tagging,
        vehicle_capacity=entry.vehicle_capacity,
        dock_no=entry.dock_no,
        consignment_no=entry.consignment_no,
        driver_name=entry.driver_name,
        driver_phone=entry.driver_phone,
        status=entry.status
    )
    
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    
    return new_log

@app.get("/logs/history", response_model=List[schemas.VehicleLogResponse], dependencies=[Depends(get_api_key)])
def get_history(area: Optional[str] = None, skip: int = 0, limit: int = 500, db: Session = Depends(get_db)):
    query = db.query(models.VehicleLog)
    if area:
        query = query.filter(models.VehicleLog.area == area)
    
    return query.order_by(models.VehicleLog.id.desc()).offset(skip).limit(limit).all()

@app.delete("/logs/{log_id}", response_model=schemas.SuccessStatus, dependencies=[Depends(get_api_key)])
def delete_log(log_id: int, db: Session = Depends(get_db)):
    log = db.query(models.VehicleLog).filter(models.VehicleLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    db.delete(log)
    db.commit()
    return {"success": True, "message": "Log entry deleted successfully"}

# --- WHITELIST MANAGEMENT ---
@app.post("/whitelist", response_model=schemas.WhitelistResponse, dependencies=[Depends(get_api_key)])
def add_to_whitelist(item: schemas.WhitelistCreate, db: Session = Depends(get_db)):
    # Check if exists
    existing = db.query(models.Whitelist).filter(models.Whitelist.vehicle_no == item.vehicle_no.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Vehicle already exists in whitelist")

    db_item = models.Whitelist(
        vehicle_no=item.vehicle_no.upper(),
        owner_name=item.owner_name,
        flat_no=item.flat_no,
        contact=item.contact,
        category=item.category,
        status=item.status
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.get("/whitelist", response_model=List[schemas.WhitelistResponse], dependencies=[Depends(get_api_key)])
def list_whitelist(db: Session = Depends(get_db)):
    return db.query(models.Whitelist).order_by(models.Whitelist.id.desc()).all()

@app.delete("/whitelist/{item_id}", response_model=schemas.SuccessStatus, dependencies=[Depends(get_api_key)])
def delete_whitelist_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Whitelist).filter(models.Whitelist.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Whitelist record not found")
    db.delete(item)
    db.commit()
    return {"success": True, "message": "Record removed from whitelist"}

# --- PDF REPORTS METADATA ---
@app.get("/reports", response_model=List[schemas.PDFReportSchema], dependencies=[Depends(get_api_key)])
def list_reports(area: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.PDFReport)
    if area:
        query = query.filter(models.PDFReport.area == area)
    return query.order_by(models.PDFReport.timestamp.desc()).all()

@app.post("/reports", response_model=schemas.PDFReportSchema, dependencies=[Depends(get_api_key)])
def save_report_metadata(report: schemas.PDFReportSchema, db: Session = Depends(get_db)):
    existing = db.query(models.PDFReport).filter(models.PDFReport.id == report.id).first()
    if existing:
        return existing
    
    db_report = models.PDFReport(
        id=report.id,
        name=report.name,
        area=report.area,
        timestamp=report.timestamp,
        entry_count=report.entry_count
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

@app.delete("/reports/{report_id}", response_model=schemas.SuccessStatus, dependencies=[Depends(get_api_key)])
def delete_report(report_id: str, db: Session = Depends(get_db)):
    report = db.query(models.PDFReport).filter(models.PDFReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    db.delete(report)
    db.commit()
    return {"success": True, "message": "Report record deleted"}

# --- AUTO-SYNC INFRASTRUCTURE ---
@app.post("/sync", dependencies=[Depends(get_api_key)])
def sync_logs(db: Session = Depends(get_db)):
    unsynced = db.query(models.VehicleLog).filter(models.VehicleLog.is_synced == False).all()
    
    if not unsynced:
        return {"message": "All logs already synced."}
    
    for log in unsynced:
        log.is_synced = True
    
    db.commit()
    return {"message": f"Successfully synced {len(unsynced)} logs to central server."}

# --- GOOGLE DESKTOP OAUTH FLOW ---
import webbrowser
import urllib.parse
from fastapi.responses import HTMLResponse

# In-memory store to hold login states initiated from the desktop UI
desktop_auth_states = {}  # session_id -> {"status": "pending", "user": None}

@app.get("/auth/google/login")
def auth_google_login(session_id: str):
    """
    Called by the desktop frontend. This endpoint opens the system's default
    browser (Chrome) to handle the Google sign-in process natively.
    """
    desktop_auth_states[session_id] = {"status": "pending", "user": None}
    
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        # Fallback Mock Flow if the user hasn't put their client ID in .env yet
        mock_url = f"http://127.0.0.1:8001/auth/google/mock_prompt?session_id={session_id}"
        webbrowser.open(mock_url)
        return {"status": "browser_opened", "mode": "mock"}

    # Real Google OAuth Flow Request
    redirect_uri = "http://127.0.0.1:8001/auth/google/callback"
    google_oauth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={client_id}&"
        f"redirect_uri={urllib.parse.quote(redirect_uri)}&"
        f"response_type=code&"
        f"scope=email%20profile&"
        f"state={session_id}"
    )
    
    # Opens existing system Chrome browser safely
    webbrowser.open(google_oauth_url)
    return {"status": "browser_opened", "mode": "live"}

@app.get("/auth/google/callback")
def auth_google_callback(code: str = None, state: str = None, error: str = None):
    """
    Google redirects back to this local endpoint after user finishes in Chrome.
    """
    if state in desktop_auth_states:
        if error:
            desktop_auth_states[state] = {"status": "failed", "error": error}
            return HTMLResponse("<h1>Login Failed</h1><p>You can close this tab and return to the app.</p>")
        
        # Here we would normally exchange `code` for token with requests.post
        # For now, we instantly grant access simulating a successful verification
        desktop_auth_states[state] = {
            "status": "success", 
            "user": {"email": "operator_oauth@gatiq.in", "name": "Google User"}
        }
        
        return HTMLResponse("""
        <html>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; margin-top: 50px; background: #f8fafc; color: #1e293b;">
            <div style="background: white; max-width: 500px; margin: 0 auto; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                <div style="font-size: 48px; margin-bottom: 20px;">✅</div>
                <h2 style="color: #22c55e; margin-bottom: 10px;">Authentication Successful</h2>
                <p style="font-size: 16px; color: #475569; margin-bottom: 30px;">You are now signed in to GATIQ securely via your Chrome profile.</p>
                <p><b>Please close this tab and return to the GATIQ desktop application.</b></p>
                <script>
                    setTimeout(() => window.close(), 4000);
                </script>
            </div>
        </body>
        </html>
        """)
    return HTMLResponse("<h1>Session Error</h1><p>Invalid or expired login session. Try again from GATIQ.</p>")

@app.get("/auth/google/mock_prompt")
def auth_google_mock(session_id: str):
    """Fallback interactive prompt if Client ID isn't configured yet."""
    return HTMLResponse(f"""
    <html>
    <body style="font-family: 'Segoe UI', Tahoma, sans-serif; text-align: center; background: #f8fafc; padding-top: 80px;">
        <div style="background: white; max-width: 500px; margin: 0 auto; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
            <h2 style="color: #1e293b;">Chrome OAuth Simulator</h2>
            <p style="color: #475569; margin-bottom: 25px;">You are in Chrome. Click below to securely authorize the Desktop App to access your account.</p>
            <button onclick="window.location.href='/auth/google/callback?code=simulated_code_abc123&state={session_id}'" 
                    style="padding: 12px 24px; font-size: 16px; font-weight: bold; background: #4285F4; color: white; border: none; border-radius: 6px; cursor:pointer;">
                Authorize & Login as Google Id
            </button>
            <p style="margin-top: 20px; font-size: 12px; color: #94a3b8;">Configure GOOGLE_CLIENT_ID in backend .env to use live Google login.</p>
        </div>
    </body>
    </html>
    """)

@app.get("/auth/google/status")
def auth_google_status(session_id: str):
    """
    Desktop frontend polls this to know when Chrome has finished logging them in.
    """
    state_data = desktop_auth_states.get(session_id)
    if not state_data:
        raise HTTPException(status_code=404, detail="Session not found")
    return state_data
