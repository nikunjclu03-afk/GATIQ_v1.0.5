from sqlalchemy.orm import Session

from .. import models


def ensure_pdf_report(
    db: Session,
    *,
    report_id: str,
    name: str,
    area: str,
    timestamp,
    entry_count: int,
) -> models.PDFReport:
    existing = db.query(models.PDFReport).filter(models.PDFReport.id == report_id).first()
    if existing:
        return existing

    db_report = models.PDFReport(
        id=report_id,
        name=name,
        area=area,
        timestamp=timestamp,
        entry_count=entry_count,
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report
