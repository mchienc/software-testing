"""
FastAPI Application Entry Point
Mounts API routers, Static file storage for screenshots, and Built-in Demo Sites.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.core.config import settings
from app.core.logger import logger
from app.api import suites, runs
from app.services.storage_manager import storage_manager
from app.models.schemas import TestSuiteCreate

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Automated Visual Regression Testing Tool with Perceptual Diff, SSIM & Anti-Flakiness",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration for Frontend dev and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(suites.router, prefix=settings.API_PREFIX)
app.include_router(runs.router, prefix=settings.API_PREFIX)

# Mount Static File Handlers
# 1. Storage folder (Serves baseline, current, diff images, and HTML reports)
app.mount(
    "/storage",
    StaticFiles(directory=str(settings.STORAGE_PATH), html=True),
    name="storage"
)

# 2. Demo Sites folder (Provides built-in v1.0 baseline and v2.0 regression sites for instant grading)
app.mount(
    "/demo",
    StaticFiles(directory=str(settings.DEMO_SITES_PATH), html=True),
    name="demo"
)

@app.get("/api")
async def root_api():
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "demo_baseline": f"http://localhost:{settings.PORT}/demo/v1_baseline/index.html",
        "demo_regression": f"http://localhost:{settings.PORT}/demo/v2_regression/index.html",
    }


@app.on_event("startup")
async def startup_event():
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION}")
    # Initialize default demo suite if storage is empty
    existing_suites = storage_manager.list_suites()
    if not existing_suites:
        demo_suite = TestSuiteCreate(
            name="SaaSify Platform (Demo Suite)",
            url=f"http://localhost:{settings.PORT}/demo/v2_regression/index.html",
            baseline_url=f"http://localhost:{settings.PORT}/demo/v1_baseline/index.html",
            viewports=["desktop", "tablet", "mobile"],
            threshold=0.05,
            color_threshold=0.1,
            mask_selectors=[".timestamp"]
        )
        created = storage_manager.create_suite(demo_suite)
        logger.info(f"Initialized default demo suite: {created['id']}")


from fastapi.responses import FileResponse

# 3. Frontend Static Build
FRONTEND_DIST = settings.BACKEND_DIR.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount(
        "/assets",
        StaticFiles(directory=str(FRONTEND_DIST / "assets")),
        name="assets"
    )

    @app.get("/")
    async def serve_index():
        return FileResponse(str(FRONTEND_DIST / "index.html"))


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": settings.VERSION}
