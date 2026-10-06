"""
Test Suites API Router
Endpoints for managing test suites and triggering regression runs.
"""

from typing import List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.models.schemas import (
    TestSuite,
    TestSuiteCreate,
    TestRunTrigger,
    TestRunResponse,
    BaselineCaptureRequest,
    BaselineCaptureResponse,
    BaselineItem
)
from app.services.storage_manager import storage_manager
from app.services.test_runner import execute_test_run
from app.services.browser_engine import BrowserEngine
from app.core.config import settings

router = APIRouter(prefix="/suites", tags=["Test Suites"])


@router.post("", response_model=Dict[str, Any], status_code=201)
async def create_test_suite(suite_in: TestSuiteCreate):
    """Creates a new visual regression test suite."""
    suite = storage_manager.create_suite(suite_in)
    return suite


@router.get("", response_model=List[Dict[str, Any]])
async def list_test_suites():
    """Lists all configured test suites."""
    return storage_manager.list_suites()


@router.get("/{suite_id}", response_model=Dict[str, Any])
async def get_test_suite(suite_id: str):
    """Retrieves configuration for a specific test suite."""
    suite = storage_manager.get_suite(suite_id)
    if not suite:
        raise HTTPException(status_code=404, detail=f"Suite #{suite_id} not found")
    return suite


@router.delete("/{suite_id}")
async def delete_test_suite(suite_id: str):
    """Deletes a test suite and its stored baselines."""
    success = storage_manager.delete_suite(suite_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Suite #{suite_id} not found")
    return {"message": f"Suite #{suite_id} deleted successfully"}


@router.post("/{suite_id}/run", response_model=Dict[str, Any])
async def trigger_suite_run(suite_id: str, trigger: TestRunTrigger = TestRunTrigger()):
    """Triggers an end-to-end visual regression execution session for the suite."""
    suite = storage_manager.get_suite(suite_id)
    if not suite:
        raise HTTPException(status_code=404, detail=f"Suite #{suite_id} not found")

    try:
        run_record = await execute_test_run(suite_id, trigger)
        return run_record
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Run execution failed: {str(e)}")


@router.get("/{suite_id}/runs", response_model=List[Dict[str, Any]])
async def list_suite_runs(suite_id: str):
    """Returns historical execution runs for a specific suite."""
    suite = storage_manager.get_suite(suite_id)
    if not suite:
        raise HTTPException(status_code=404, detail=f"Suite #{suite_id} not found")
    return storage_manager.list_runs(suite_id=suite_id)


@router.post("/{suite_id}/capture-baseline", response_model=BaselineCaptureResponse)
async def capture_suite_baseline(
    suite_id: str,
    payload: BaselineCaptureRequest = BaselineCaptureRequest()
):
    """
    Dedicated endpoint to capture and set official Baseline images
    across all configured viewports for a test suite.
    """
    suite = storage_manager.get_suite(suite_id)
    if not suite:
        raise HTTPException(status_code=404, detail=f"Suite #{suite_id} not found")

    target_url = payload.url_override or suite.get("baseline_url") or suite.get("url")
    viewports = suite.get("viewports", ["desktop", "tablet", "mobile"])
    mask_selectors = suite.get("mask_selectors", [])

    suite_baseline_dir = settings.BASELINES_PATH / suite_id
    suite_baseline_dir.mkdir(parents=True, exist_ok=True)

    items = []
    async with BrowserEngine(headless=True) as browser:
        for vp in viewports:
            b_path = suite_baseline_dir / f"baseline_{vp}.png"
            capture_meta = await browser.capture_screenshot(
                url=target_url,
                viewport_key=vp,
                output_path=b_path,
                mask_selectors=mask_selectors
            )
            items.append(BaselineItem(
                viewport=vp,
                image_url=f"/storage/baselines/{suite_id}/baseline_{vp}.png",
                width=capture_meta.get("width"),
                height=capture_meta.get("height"),
                file_path=str(b_path),
                size_bytes=b_path.stat().st_size if b_path.exists() else 0,
                updated_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            ))

    storage_manager.update_suite_has_baseline(suite_id, True)

    return BaselineCaptureResponse(
        suite_id=suite_id,
        suite_name=suite["name"],
        captured_url=target_url,
        message=f"Đã chụp và lưu thành công Baseline cho {len(items)} viewports",
        baselines=items
    )


@router.get("/{suite_id}/baselines")
async def get_suite_baselines(suite_id: str):
    """Returns currently stored baseline images for the suite."""
    suite = storage_manager.get_suite(suite_id)
    if not suite:
        raise HTTPException(status_code=404, detail=f"Suite #{suite_id} not found")
    baselines = storage_manager.get_suite_baselines(suite_id)
    return {
        "suite_id": suite_id,
        "suite_name": suite["name"],
        "has_baseline": len(baselines) > 0,
        "baselines": baselines
    }
