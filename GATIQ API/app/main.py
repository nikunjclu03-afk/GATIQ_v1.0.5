from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import database, models
from .core.config import API_TITLE, API_VERSION, CORS_ORIGIN_REGEX, ensure_required_config
from .routers import auth, health, jobs, logs, reports, root, scan, sync, whitelist
from .services.ai_runtime import warmup_async
from .services.job_service import start_worker

ensure_required_config()
models.Base.metadata.create_all(bind=database.engine)

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
app.include_router(logs.router)
app.include_router(whitelist.router)
app.include_router(reports.router)
app.include_router(sync.router)
app.include_router(auth.router)
