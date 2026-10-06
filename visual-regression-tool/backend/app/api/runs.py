"""
Test Runs API Router
Endpoints for inspecting run analysis metrics, approving baselines, and exporting reports.
"""

from typing import List, Dict, Any
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse, FileResponse

from app.core.config import settings
from app.services.storage_manager import storage_manager

router = APIRouter(prefix="/runs", tags=["Test Runs"])


@router.get("", response_model=List[Dict[str, Any]])
async def list_all_runs():
    """Lists all historical test execution runs across all suites."""
    return storage_manager.list_runs()


@router.get("/{run_id}", response_model=Dict[str, Any])
async def get_run_details(run_id: str):
    """Retrieves full analysis metrics, diff scores, and image URLs for a run."""
    run = storage_manager.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Run #{run_id} not found")
    return run


@router.post("/{run_id}/approve")
async def approve_run_as_baseline(run_id: str):
    """
    Approves current screenshots from this run as the new standard Baseline
    for subsequent visual regression cycles.
    """
    run = storage_manager.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Run #{run_id} not found")

    success = storage_manager.approve_baseline(run_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to approve baseline images")

    return {
        "message": f"Run #{run_id} successfully approved as the new baseline.",
        "suite_id": run["suite_id"]
    }


@router.get("/{run_id}/report", response_class=HTMLResponse)
async def get_html_report(run_id: str):
    """Returns the standalone HTML report for this run."""
    report_file = settings.STORAGE_PATH / "runs" / run_id / "report.html"
    if not report_file.exists():
        raise HTTPException(status_code=404, detail="HTML report not found")
    return HTMLResponse(content=report_file.read_text(encoding="utf-8"))
