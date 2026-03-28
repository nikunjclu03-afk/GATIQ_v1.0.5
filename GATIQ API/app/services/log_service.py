from sqlalchemy.orm import Session

from .. import models, schemas
from .event_service import record_event


def create_vehicle_log(entry: schemas.VehicleLogCreate, db: Session) -> models.VehicleLog:
    vehicle_no_up = entry.vehicle_no.upper()
    whitelist_entry = (
        db.query(models.Whitelist).filter(models.Whitelist.vehicle_no == vehicle_no_up).first()
    )

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
        status=entry.status,
    )

    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    record_event(
        db,
        event_type="vehicle_log_created",
        aggregate_type="vehicle_log",
        aggregate_id=str(new_log.id),
        payload={
            "vehicle_no": new_log.vehicle_no,
            "area": new_log.area,
            "gate_no": new_log.gate_no,
            "status": new_log.status,
            "is_synced": new_log.is_synced,
        },
    )
    return new_log
