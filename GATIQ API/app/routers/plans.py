"""Phase 3: Plan Entitlements & Feature Gating Router"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from .. import schemas
from ..dependencies import get_db
from ..services import plan_service

router = APIRouter(prefix="/plans", tags=["Subscription Plans"])


@router.get("/entitlements", response_model=List[schemas.PlanEntitlementResponse])
def list_plans(db: Session = Depends(get_db)):
    return plan_service.list_all_plans(db)


@router.get("/active")
def get_active_plan(db: Session = Depends(get_db)):
    config = plan_service.get_plan_config(db)
    return config


@router.get("/check/{feature}", response_model=schemas.PlanPolicyCheck)
def check_feature_access(feature: str, db: Session = Depends(get_db)):
    return plan_service.check_feature(db, feature)
