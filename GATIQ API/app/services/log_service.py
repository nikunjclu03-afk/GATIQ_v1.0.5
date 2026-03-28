from sqlalchemy.orm import Session

from .. import models, schemas
from .event_service import record_event
from .normalization_service import get_or_create_device, get_or_create_gate, get_or_create_site, get_or_create_user


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

    site = None
    gate = None
    device = None
    user = None
    if entry.site_id:
        site = db.query(models.Site).filter(models.Site.id == entry.site_id).first()
    if site is None:
        site = get_or_create_site(db, area=entry.area, facility_name=entry.area)

    if entry.gate_id:
        gate = db.query(models.Gate).filter(models.Gate.id == entry.gate_id).first()
    if gate is None:
        gate = get_or_create_gate(db, site_id=site.id if site else None, gate_name=entry.gate_no)

    if entry.device_id:
        device = db.query(models.Device).filter(models.Device.id == entry.device_id).first()
    if device is None:
        device = get_or_create_device(
            db,
            site_id=site.id if site else None,
            gate_id=gate.id if gate else None,
            device_uid=f"desktop-{site.id if site else 0}-{gate.id if gate else 0}",
            label=entry.gate_no,
        )

    if entry.user_id:
        user = db.query(models.AppUser).filter(models.AppUser.id == entry.user_id).first()
    if user is None:
        user = get_or_create_user(db, operator_name="Local Operator")

    new_log = models.VehicleLog(
        site_id=site.id if site else entry.site_id,
        gate_id=gate.id if gate else entry.gate_id,
        device_id=device.id if device else entry.device_id,
        user_id=user.id if user else entry.user_id,
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
    from .sync_service import enqueue_vehicle_log_sync

    enqueue_vehicle_log_sync(db, new_log)
    record_event(
        db,
        event_type="vehicle_log_created",
        aggregate_type="vehicle_log",
        aggregate_id=str(new_log.id),
        payload={
            "site_id": new_log.site_id,
            "gate_id": new_log.gate_id,
            "device_id": new_log.device_id,
            "user_id": new_log.user_id,
            "vehicle_no": new_log.vehicle_no,
            "area": new_log.area,
            "gate_no": new_log.gate_no,
            "status": new_log.status,
            "is_synced": new_log.is_synced,
        },
    )
    return new_log
