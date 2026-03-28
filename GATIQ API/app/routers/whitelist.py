from typing import List

from fastapi import APIRouter, Depends, HTTPException
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
