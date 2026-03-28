from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float
from .database import Base
import datetime

class VehicleLog(Base):
    __tablename__ = "logs"
    id = Column(Integer, primary_key=True, index=True)
    vehicle_no = Column(String, index=True)
    vehicle_type = Column(String)
    gate_no = Column(String)
    area = Column(String)
    entry_exit = Column(String) # IN or OUT
    purpose = Column(String)
    tagging = Column(String)
    vehicle_capacity = Column(String, nullable=True)
    dock_no = Column(String, nullable=True)
    consignment_no = Column(String, nullable=True)
    driver_name = Column(String, nullable=True)
    driver_phone = Column(String, nullable=True)
    status = Column(String)
    is_synced = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class Whitelist(Base):
    __tablename__ = "whitelist"
    id = Column(Integer, primary_key=True, index=True)
    vehicle_no = Column(String, unique=True, index=True)
    owner_name = Column(String)
    flat_no = Column(String, nullable=True)
    contact = Column(String, nullable=True)
    category = Column(String)  # VIP, Employee, Resident
    status = Column(String, default="Active")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class PDFReport(Base):
    __tablename__ = "reports"
    id = Column(String, primary_key=True, index=True) # UUID from frontend
    name = Column(String)
    area = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    file_path = Column(String, nullable=True)
    entry_count = Column(Integer, default=0)
