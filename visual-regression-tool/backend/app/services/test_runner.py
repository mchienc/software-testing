"""
Test Execution Orchestrator
Coordinates browser capture, visual comparison, scoring, and report generation
for test runs.
"""

import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List

from app.core.config import settings
from app.core.logger import logger
from app.core.constants import VIEWPORT_PRESETS
from app.models.schemas import TestRunTrigger, ViewportResult, BoundingBox
from app.services.browser_engine import BrowserEngine
from app.services.diff_engine import DiffEngine
from app.services.storage_manager import storage_manager
from app.services.reporter import ReportGenerator


async def execute_test_run(
    suite_id: str,
    trigger: TestRunTrigger
) -> Dict[str, Any]:
    """
    Executes a complete visual regression test run for a test suite.
    """
    suite = storage_manager.get_suite(suite_id)
    if not suite:
        raise ValueError(f"Suite with ID '{suite_id}' not found.")

    run_id = str(uuid.uuid4())[:8]
    started_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    start_time = time.time()

    target_url = trigger.override_url or suite["url"]
    viewports = suite.get("viewports", ["desktop", "tablet", "mobile"])
    mask_selectors = suite.get("mask_selectors", [])
    threshold = suite.get("threshold", 0.05)
    color_threshold = suite.get("color_threshold", 0.1)

    # File storage paths for this run
    suite_baseline_dir = settings.BASELINES_PATH / suite_id
    run_storage_dir = settings.STORAGE_PATH / "runs" / run_id
    run_currents_dir = run_storage_dir / "currents"
    run_diffs_dir = run_storage_dir / "diffs"

    for d in [suite_baseline_dir, run_currents_dir, run_diffs_dir]:
        d.mkdir(parents=True, exist_ok=True)

    logger.info(f"Initiating Test Run #{run_id} for Suite '{suite['name']}' [{target_url}]")

    viewport_results: List[Dict[str, Any]] = []
    passed_count = 0
    failed_count = 0

    async with BrowserEngine(headless=True) as browser:
        # Check if baseline needs to be captured first
        has_baseline = suite.get("has_baseline", False) and any(
            (suite_baseline_dir / f"baseline_{vp}.png").exists() for vp in viewports
        )

        # Baseline capture source: baseline_url if defined, or target_url if initializing
        if not has_baseline or trigger.capture_as_baseline:
            baseline_source_url = suite.get("baseline_url") or target_url
            logger.info(f"Capturing baseline images from: {baseline_source_url}")
            for vp in viewports:
                b_path = suite_baseline_dir / f"baseline_{vp}.png"
                await browser.capture_screenshot(
                    url=baseline_source_url,
                    viewport_key=vp,
                    output_path=b_path,
                    mask_selectors=mask_selectors
                )
            storage_manager.update_suite_has_baseline(suite_id, True)
            has_baseline = True

        # Capture Current screenshots
        diff_engine = DiffEngine(
            color_threshold=color_threshold,
            diff_ratio_threshold=threshold,
            detect_anti_aliasing=True
        )

        for vp in viewports:
            vp_preset = VIEWPORT_PRESETS.get(vp, {"width": 1920, "height": 1080})
            vp_start = time.time()
            b_path = suite_baseline_dir / f"baseline_{vp}.png"
            c_path = run_currents_dir / f"current_{vp}.png"
            d_path = run_diffs_dir / f"diff_{vp}.png"

            try:
                # Capture current
                await browser.capture_screenshot(
                    url=target_url,
                    viewport_key=vp,
                    output_path=c_path,
                    mask_selectors=mask_selectors
                )

                # Execute Perceptual Diff & SSIM
                comparison = diff_engine.compare(
                    baseline_path=b_path,
                    current_path=c_path,
                    diff_output_path=d_path
                )

                is_passed = comparison["is_passed"]
                if is_passed:
                    passed_count += 1
                else:
                    failed_count += 1

                vp_duration_ms = (time.time() - vp_start) * 1000.0

                vp_res = {
                    "viewport": vp,
                    "viewport_width": comparison["normalized_width"],
                    "viewport_height": comparison["normalized_height"],
                    "status": comparison["status"],
                    "diff_ratio": comparison["diff_ratio"],
                    "ssim_score": comparison["ssim_score"],
                    "diff_pixels": comparison["diff_pixel_count"],
                    "total_pixels": comparison["total_pixels"],
                    "bounding_boxes": comparison["bounding_boxes"],
                    "change_summary": comparison.get("change_summary", ""),
                    "semantic_insights": comparison.get("semantic_insights", []),
                    "baseline_image_url": f"/storage/baselines/{suite_id}/baseline_{vp}.png",
                    "current_image_url": f"/storage/runs/{run_id}/currents/current_{vp}.png",
                    "diff_image_url": f"/storage/runs/{run_id}/diffs/diff_{vp}.png",
                    "baseline_file_path": str(b_path),
                    "current_file_path": str(c_path),
                    "diff_file_path": str(d_path),
                    "error_message": None,
                    "duration_ms": round(vp_duration_ms, 2)
                }
                viewport_results.append(vp_res)

            except Exception as e:
                logger.error(f"Error during viewport {vp} processing: {str(e)}")
                failed_count += 1
                viewport_results.append({
                    "viewport": vp,
                    "viewport_width": vp_preset["width"],
                    "viewport_height": vp_preset["height"],
                    "status": "ERROR",
                    "diff_ratio": 100.0,
                    "ssim_score": 0.0,
                    "diff_pixels": 0,
                    "total_pixels": 0,
                    "bounding_boxes": [],
                    "change_summary": f"Xảy ra lỗi ngoại lệ: {str(e)}",
                    "semantic_insights": [f"Lỗi: {str(e)}"],
                    "baseline_image_url": None,
                    "current_image_url": None,
                    "diff_image_url": None,
                    "error_message": str(e),
                    "duration_ms": 0.0
                })

    duration_seconds = round(time.time() - start_time, 2)
    overall_status = "PASSED" if failed_count == 0 else "FAILED"

    # Synthesize Executive Summary across all viewports
    if failed_count == 0:
        exec_summary = "Toàn bộ các viewports đều đạt chuẩn (PASSED). Giao diện trang web bảo toàn cấu trúc hoàn hảo và không ghi nhận bất kỳ sự sai lệch ngoài mong muốn nào."
    else:
        distinct_findings = []
        for r in viewport_results:
            for ins in r.get("semantic_insights", []):
                if ins not in distinct_findings:
                    distinct_findings.append(ins)
        findings_str = " ".join(distinct_findings[:3])
        exec_summary = (
            f"Phiên kiểm thử phát hiện lỗi hồi quy giao diện trên {failed_count}/{len(viewports)} màn hình. "
            f"Tóm tắt các thay đổi nổi bật: {findings_str}"
        )

    run_record = {
        "id": run_id,
        "suite_id": suite_id,
        "suite_name": suite["name"],
        "target_url": target_url,
        "status": "COMPLETED",
        "overall_status": overall_status,
        "executive_summary": exec_summary,
        "started_at": started_at,
        "completed_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "duration_seconds": duration_seconds,
        "total_viewports": len(viewports),
        "passed_viewports": passed_count,
        "failed_viewports": failed_count,
        "results": viewport_results
    }

    # Save run record
    storage_manager.save_run(run_record)

    # Generate persistent HTML report
    html_report_path = run_storage_dir / "report.html"
    ReportGenerator.generate_html_report(run_record, html_report_path)

    logger.info(f"Test Run #{run_id} completed: Status={overall_status} ({passed_count}/{len(viewports)} Passed) in {duration_seconds}s")
    return run_record
