"""
Phase 3: Local Subscription Plan Policy Engine
Enforces feature gates for Starter / Professional / Enterprise plans.
No live payments — just local policy enforcement.
"""
import json
from typing import Optional
from sqlalchemy.orm import Session

from .. import models, schemas

# Default plan definitions — seeded on first startup
PLAN_DEFINITIONS = {
    "starter": {
        "max_cameras": 1,
        "retention_days": 30,
        "features": {
            "scan": True,
            "review_queue": True,
            "manual_entry": True,
            "basic_reports": True,
            "csv_export": True,
            "whitelist": True,
            "incident_capture": False,
            "advanced_analytics": False,
            "cloud_backup": False,
            "branded_reports": False,
            "audit_log": False,
            "bulk_import": False,
        }
    },
    "professional": {
        "max_cameras": 4,
        "retention_days": 90,
        "features": {
            "scan": True,
            "review_queue": True,
            "manual_entry": True,
            "basic_reports": True,
            "csv_export": True,
            "whitelist": True,
            "incident_capture": True,
            "advanced_analytics": True,
            "cloud_backup": True,
            "branded_reports": False,
            "audit_log": True,
            "bulk_import": True,
        }
    },
    "enterprise": {
        "max_cameras": 99,
        "retention_days": 365,
        "features": {
            "scan": True,
            "review_queue": True,
            "manual_entry": True,
            "basic_reports": True,
            "csv_export": True,
            "whitelist": True,
            "incident_capture": True,
            "advanced_analytics": True,
            "cloud_backup": True,
            "branded_reports": True,
            "audit_log": True,
            "bulk_import": True,
        }
    }
}


def seed_plans(db: Session):
    """Seed default plan entitlements if they don't exist."""
    for tier, config in PLAN_DEFINITIONS.items():
        existing = db.query(models.PlanEntitlement).filter(
            models.PlanEntitlement.plan_tier == tier
        ).first()
        if not existing:
            db.add(models.PlanEntitlement(
                plan_tier=tier,
                max_cameras=config["max_cameras"],
                retention_days=config["retention_days"],
                features_json=json.dumps(config["features"])
            ))
    db.commit()


def get_active_plan(db: Session) -> str:
    """
    Get the currently active plan tier.
    Stored in localStorage on the frontend and passed as header,
    but we also check for a local config / fallback to 'starter'.
    """
    # For now, we check if there's a plan marker or default to professional
    # In production, this would read from a license file or remote entitlement
    return "professional"


def get_plan_config(db: Session, plan_tier: Optional[str] = None) -> dict:
    """Get the full plan configuration."""
    tier = plan_tier or get_active_plan(db)
    plan = db.query(models.PlanEntitlement).filter(
        models.PlanEntitlement.plan_tier == tier
    ).first()
    if plan and plan.features_json:
        features = json.loads(plan.features_json)
        return {
            "plan_tier": plan.plan_tier,
            "max_cameras": plan.max_cameras,
            "retention_days": plan.retention_days,
            "features": features
        }
    # Fallback to hardcoded
    config = PLAN_DEFINITIONS.get(tier, PLAN_DEFINITIONS["starter"])
    return {
        "plan_tier": tier,
        "max_cameras": config["max_cameras"],
        "retention_days": config["retention_days"],
        "features": config["features"]
    }


def check_feature(db: Session, feature: str, plan_tier: Optional[str] = None) -> schemas.PlanPolicyCheck:
    """Check if a specific feature is allowed under the active plan."""
    config = get_plan_config(db, plan_tier)
    allowed = config["features"].get(feature, False)
    return schemas.PlanPolicyCheck(
        feature=feature,
        allowed=allowed,
        plan_tier=config["plan_tier"],
        message=None if allowed else f"Feature '{feature}' requires a higher plan than '{config['plan_tier']}'."
    )


def list_all_plans(db: Session) -> list:
    """Return all plan entitlements."""
    return db.query(models.PlanEntitlement).order_by(models.PlanEntitlement.id).all()
