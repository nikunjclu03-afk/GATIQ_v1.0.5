from typing import List

import csv
import io
import json

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from .. import models, schemas
from ..dependencies import get_api_key, get_db

router = APIRouter(prefix="/whitelist", tags=["whitelist"])


@router.post("", response_model=schemas.WhitelistResponse, dependencies=[Depends(get_api_key)])
def add_to_whitelist(item: schemas.WhitelistCreate, db: Session = Depends(get_db)):
    existing = (
        db.query(models.Whitelist).filter(models.Whitelist.vehicle_no == item.vehicle_no.upper()).first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Vehicle already exists in whitelist")

    db_item = models.Whitelist(
        vehicle_no=item.vehicle_no.upper(),
        owner_name=item.owner_name,
        flat_no=item.flat_no,
        contact=item.contact,
        category=item.category,
        status=item.status,
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@router.get("", response_model=List[schemas.WhitelistResponse], dependencies=[Depends(get_api_key)])
def list_whitelist(db: Session = Depends(get_db)):
    return db.query(models.Whitelist).order_by(models.Whitelist.id.desc()).all()


@router.delete("/{item_id}", response_model=schemas.SuccessStatus, dependencies=[Depends(get_api_key)])
def delete_whitelist_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Whitelist).filter(models.Whitelist.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Whitelist record not found")
    db.delete(item)
    db.commit()
    return {"success": True, "message": "Record removed from whitelist"}


@router.post("/import", response_model=schemas.WhitelistImportJobResponse, dependencies=[Depends(get_api_key)])
def import_whitelist_csv(
    file: UploadFile = File(...),
    operator_id: str = Form("unknown"),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    contents = file.file.read()
    try:
        decoded = contents.decode('utf-8-sig') # Handle optional BOM
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid file encoding. Must be UTF-8.")
        
    reader = csv.DictReader(io.StringIO(decoded))
    
    job = models.WhitelistImportJob(
        filename=file.filename,
        operator_id=operator_id,
        status="processing"
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    success_count = 0
    error_count = 0
    errors = []

    for idx, row in enumerate(reader):
        # Allow fallback checks for poorly formatted CSV headers
        vehicle_no = row.get("vehicle_no", row.get("Vehicle No", "")).strip().upper()
        if not vehicle_no:
            error_count += 1
            errors.append({"row": idx+2, "error": "Missing vehicle_no"})
            continue
            
        existing = db.query(models.Whitelist).filter(models.Whitelist.vehicle_no == vehicle_no).first()
        if existing:
            error_count += 1
            errors.append({"row": idx+2, "error": f"Vehicle {vehicle_no} already exists"})
            continue
            
        owner_name = row.get("owner_name", row.get("Owner Name", ""))
        flat_no = row.get("flat_no", row.get("Flat No", ""))
        contact = row.get("contact", row.get("Contact", ""))
        category = row.get("category", row.get("Category", "Resident"))
        status = row.get("status", row.get("Status", "Active"))
        
        db_item = models.Whitelist(
            vehicle_no=vehicle_no,
            owner_name=owner_name,
            flat_no=flat_no,
            contact=contact,
            category=category,
            status=status
        )
        db.add(db_item)
        success_count += 1
        
    db.commit()
    
    job.status = "completed"
    job.total_rows = success_count + error_count
    job.success_count = success_count
    job.error_count = error_count
    job.error_details_json = json.dumps(errors) if errors else None
    
    from datetime import datetime
    job.completed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(job)
    return job
