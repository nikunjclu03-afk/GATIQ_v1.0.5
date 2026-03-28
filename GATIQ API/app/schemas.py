from pydantic import BaseModel
from typing import Optional, Dict, List
import datetime

class VehicleLogCreate(BaseModel):
    vehicle_no: str
    vehicle_type: str
    gate_no: str
    area: str
    entry_exit: str
    purpose: Optional[str] = None
    tagging: Optional[str] = None
    vehicle_capacity: Optional[str] = None
    dock_no: Optional[str] = None
    consignment_no: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    status: Optional[str] = None

class VehicleLogResponse(VehicleLogCreate):
    id: int
    is_synced: bool
    timestamp: datetime.datetime
    
    class Config:
        from_attributes = True

# --- Scanning Schemas ---
class PlateDetection(BaseModel):
    plate_number: str
    direction: str
    tagging: str
    vehicle_type: Optional[str] = "Unknown"

class ScanRequest(BaseModel):
    image_base64: str

class CCTVScanRequest(BaseModel):
    rtsp_url: str

class ScanResponse(BaseModel):
    vehicles: List[PlateDetection]
    detection_time: str
    provider: str

# --- Whitelist Schemas ---
class WhitelistBase(BaseModel):
    vehicle_no: str
    owner_name: str
    flat_no: Optional[str] = None
    contact: Optional[str] = None
    category: str = "Regular"
    status: str = "Active"

class WhitelistCreate(WhitelistBase):
    pass

class WhitelistResponse(WhitelistBase):
    id: int
    
    class Config:
        from_attributes = True

# --- PDF Reports ---
class PDFReportSchema(BaseModel):
    id: str # UUID
    name: str
    area: str
    timestamp: datetime.datetime
    entry_count: int

    class Config:
        from_attributes = True

# --- Generic Response ---
class SuccessStatus(BaseModel):
    success: bool
    message: str
    id: Optional[int] = None
