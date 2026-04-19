from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import database, models
from .core.config import API_TITLE, API_VERSION, CORS_ORIGIN_REGEX, ensure_required_config
from .routers import camera, exceptions, health, jobs, logs, reports, reviews, root, scan, sync, vehicles, whitelist, audit, incidents, plans, analytics, exports, corrections
from .services.ai_runtime import warmup_async
from .services.job_service import start_worker
from .services.normalization_service import backfill_normalized_references
from .services.schema_service import ensure_normalized_schema

ensure_required_config()
ensure_normalized_schema()
models.Base.metadata.create_all(bind=database.engine)
with database.SessionLocal() as _db:
    backfill_normalized_references(_db)
    from .services.plan_service import seed_plans
    seed_plans(_db)

app = FastAPI(title=API_TITLE, version=API_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    warmup_async()
    start_worker()


app.include_router(root.router)
app.include_router(health.router)
app.include_router(jobs.router)
app.include_router(scan.router)
app.include_router(reviews.router)
app.include_router(logs.router)
app.include_router(whitelist.router)
app.include_router(reports.router)
app.include_router(sync.router)
app.include_router(vehicles.router)
app.include_router(exceptions.router)
app.include_router(camera.router)
app.include_router(audit.router)
app.include_router(incidents.router)
app.include_router(plans.router)
app.include_router(analytics.router)
app.include_router(exports.router)
app.include_router(corrections.router)
