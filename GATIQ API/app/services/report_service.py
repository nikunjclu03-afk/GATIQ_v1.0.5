from sqlalchemy.orm import Session

from .. import models
from .normalization_service import get_or_create_device, get_or_create_gate, get_or_create_site, get_or_create_user


def ensure_pdf_report(
    db: Session,
    *,
    report_id: str,
    name: str,
    area: str,
    timestamp,
    entry_count: int,
    site_id=None,
    gate_id=None,
    device_id=None,
    user_id=None,
    gate_no=None,
) -> models.PDFReport:
    existing = db.query(models.PDFReport).filter(models.PDFReport.id == report_id).first()
    if existing:
        return existing

    site = db.query(models.Site).filter(models.Site.id == site_id).first() if site_id else None
    if site is None:
        site = get_or_create_site(db, area=area, facility_name=name)
    gate = db.query(models.Gate).filter(models.Gate.id == gate_id).first() if gate_id else None
    if gate is None:
        gate = get_or_create_gate(db, site_id=site.id if site else None, gate_name=gate_no)
    device = db.query(models.Device).filter(models.Device.id == device_id).first() if device_id else None
    if device is None:
        device = get_or_create_device(
            db,
            site_id=site.id if site else None,
            gate_id=gate.id if gate else None,
            device_uid=f"report-device-{site.id if site else 0}-{gate.id if gate else 0}",
            label=name,
        )
    user = db.query(models.AppUser).filter(models.AppUser.id == user_id).first() if user_id else None
    if user is None:
        user = get_or_create_user(db, operator_name="Local Operator")

    db_report = models.PDFReport(
        id=report_id,
        site_id=site.id if site else site_id,
        gate_id=gate.id if gate else gate_id,
        device_id=device.id if device else device_id,
        user_id=user.id if user else user_id,
        name=name,
        area=area,
        timestamp=timestamp,
        entry_count=entry_count,
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    from .sync_service import enqueue_report_sync

    enqueue_report_sync(db, db_report)
    return db_report
