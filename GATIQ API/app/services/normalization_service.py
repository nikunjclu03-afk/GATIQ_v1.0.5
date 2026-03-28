from typing import Optional

from sqlalchemy.orm import Session

from .. import models


def _normalize_name(value: Optional[str], fallback: str) -> str:
    normalized = str(value or "").strip()
    return normalized or fallback


def get_or_create_site(db: Session, *, area: Optional[str], facility_name: Optional[str] = None) -> models.Site:
    site_name = _normalize_name(facility_name or area, "Default Site")
    area_label = _normalize_name(area, site_name)
    site = db.query(models.Site).filter(models.Site.name == site_name).first()
    if site:
        if not site.area_label:
            site.area_label = area_label
            db.commit()
            db.refresh(site)
        return site

    site = models.Site(name=site_name, area_label=area_label)
    db.add(site)
    db.commit()
    db.refresh(site)
    return site


def get_or_create_gate(db: Session, *, site_id: Optional[int], gate_name: Optional[str]) -> models.Gate:
    normalized_gate = _normalize_name(gate_name, "Gate 1")
    gate = (
        db.query(models.Gate)
        .filter(models.Gate.site_id == site_id, models.Gate.name == normalized_gate)
        .first()
    )
    if gate:
        return gate

    gate = models.Gate(site_id=site_id, name=normalized_gate, code=normalized_gate)
    db.add(gate)
    db.commit()
    db.refresh(gate)
    return gate


def get_or_create_device(
    db: Session,
    *,
    site_id: Optional[int],
    gate_id: Optional[int],
    device_uid: Optional[str],
    label: Optional[str] = None,
) -> models.Device:
    normalized_uid = _normalize_name(device_uid, f"desktop-{site_id or 0}-{gate_id or 0}")
    device = db.query(models.Device).filter(models.Device.device_uid == normalized_uid).first()
    if device:
        updated = False
        if gate_id and device.gate_id != gate_id:
            device.gate_id = gate_id
            updated = True
        if site_id and device.site_id != site_id:
            device.site_id = site_id
            updated = True
        if label and device.label != label:
            device.label = label
            updated = True
        if updated:
            db.commit()
            db.refresh(device)
        return device

    device = models.Device(
        site_id=site_id,
        gate_id=gate_id,
        device_uid=normalized_uid,
        label=label or normalized_uid,
        device_type="desktop",
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return device


def get_or_create_user(
    db: Session,
    *,
    operator_name: Optional[str],
    external_uid: Optional[str] = None,
    email: Optional[str] = None,
    role: str = "operator",
) -> models.AppUser:
    normalized_name = _normalize_name(operator_name, "Local Operator")
    query = db.query(models.AppUser)
    user = None
    if external_uid:
        user = query.filter(models.AppUser.external_uid == external_uid).first()
    if user is None and email:
        user = query.filter(models.AppUser.email == email).first()
    if user is None:
        user = query.filter(models.AppUser.name == normalized_name).first()
    if user:
        updated = False
        if external_uid and user.external_uid != external_uid:
            user.external_uid = external_uid
            updated = True
        if email and user.email != email:
            user.email = email
            updated = True
        if role and user.role != role:
            user.role = role
            updated = True
        if updated:
            db.commit()
            db.refresh(user)
        return user

    user = models.AppUser(
        external_uid=external_uid,
        name=normalized_name,
        email=email,
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def backfill_normalized_references(db: Session) -> None:
    logs = db.query(models.VehicleLog).all()
    for log in logs:
        if log.site_id and log.gate_id and log.device_id and log.user_id:
            continue
        site = get_or_create_site(db, area=log.area, facility_name=log.area)
        gate = get_or_create_gate(db, site_id=site.id, gate_name=log.gate_no)
        device = get_or_create_device(
            db,
            site_id=site.id,
            gate_id=gate.id,
            device_uid=f"desktop-{site.id}-{gate.id}",
            label=log.gate_no,
        )
        user = get_or_create_user(db, operator_name=log.driver_name or "Local Operator")
        log.site_id = log.site_id or site.id
        log.gate_id = log.gate_id or gate.id
        log.device_id = log.device_id or device.id
        log.user_id = log.user_id or user.id

    reports = db.query(models.PDFReport).all()
    for report in reports:
        if report.site_id and report.gate_id and report.device_id and report.user_id:
            continue
        site = get_or_create_site(db, area=report.area, facility_name=report.name)
        gate = get_or_create_gate(db, site_id=site.id, gate_name="Main Gate")
        device = get_or_create_device(
            db,
            site_id=site.id,
            gate_id=gate.id,
            device_uid=f"report-device-{site.id}-{gate.id}",
            label=report.name,
        )
        user = get_or_create_user(db, operator_name="Local Operator")
        report.site_id = report.site_id or site.id
        report.gate_id = report.gate_id or gate.id
        report.device_id = report.device_id or device.id
        report.user_id = report.user_id or user.id

    scan_jobs = db.query(models.ScanJob).all()
    for scan_job in scan_jobs:
        if scan_job.site_id and scan_job.gate_id and scan_job.device_row_id and scan_job.user_id:
            continue
        site = get_or_create_site(db, area=scan_job.area, facility_name=scan_job.facility_name or scan_job.area)
        gate = get_or_create_gate(db, site_id=site.id, gate_name=scan_job.gate_no)
        device = get_or_create_device(
            db,
            site_id=site.id,
            gate_id=gate.id,
            device_uid=scan_job.device_id,
            label=scan_job.gate_no,
        )
        user = get_or_create_user(db, operator_name=scan_job.operator_name)
        scan_job.site_id = scan_job.site_id or site.id
        scan_job.gate_id = scan_job.gate_id or gate.id
        scan_job.device_row_id = scan_job.device_row_id or device.id
        scan_job.user_id = scan_job.user_id or user.id

    report_jobs = db.query(models.ReportJob).all()
    for report_job in report_jobs:
        if report_job.site_id and report_job.gate_id and report_job.device_id and report_job.user_id:
            continue
        site = get_or_create_site(db, area=report_job.area, facility_name=report_job.name)
        gate = get_or_create_gate(db, site_id=site.id, gate_name=report_job.gate_no)
        device = get_or_create_device(
            db,
            site_id=site.id,
            gate_id=gate.id,
            device_uid=f"report-{site.id}-{gate.id}",
            label=report_job.name,
        )
        user = get_or_create_user(db, operator_name="Local Operator")
        report_job.site_id = report_job.site_id or site.id
        report_job.gate_id = report_job.gate_id or gate.id
        report_job.device_id = report_job.device_id or device.id
        report_job.user_id = report_job.user_id or user.id

    db.commit()
