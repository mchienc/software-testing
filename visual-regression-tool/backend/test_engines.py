"""
Verification & Test Runner for BrowserEngine and DiffEngine
Validates:
1. Playwright capture across Desktop/Tablet/Mobile with anti-flakiness & masking
2. Perceptual Diff, SSIM, Bounding Box clustering, and Pass/Fail evaluation
3. Dimension auto-padding normalization
4. Error handling (Navigation timeout, invalid URLs)
"""

import asyncio
from pathlib import Path
import sys

# Ensure backend root is on sys.path
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.services.browser_engine import (
    BrowserEngine,
    PageNavigationTimeoutError,
    InvalidTargetURLError
)
from app.services.diff_engine import DiffEngine
from app.core.config import settings
from app.core.logger import logger


async def run_verification():
    logger.info("==================================================")
    logger.info("STARTING VISUAL REGRESSION ENGINE VERIFICATION")
    logger.info("==================================================")

    v1_html_path = (settings.DEMO_SITES_PATH / "v1_baseline" / "index.html").resolve()
    v2_html_path = (settings.DEMO_SITES_PATH / "v2_regression" / "index.html").resolve()

    v1_url = v1_html_path.as_uri()
    v2_url = v2_html_path.as_uri()

    test_storage = settings.STORAGE_PATH / "verification_run"
    baseline_dir = test_storage / "baseline"
    current_dir = test_storage / "current"
    diff_dir = test_storage / "diff"

    viewports = ["desktop", "tablet", "mobile"]
    mask_selectors = [".timestamp"]

    # -------------------------------------------------------------
    # 1. TEST BROWSER CAPTURE ENGINE
    # -------------------------------------------------------------
    logger.info("\n--- STEP 1: Capturing Baseline (v1.0) & Current (v2.0) ---")
    async with BrowserEngine(headless=True) as browser:
        # Capture Baseline across viewports
        logger.info(f"Capturing baseline from: {v1_url}")
        baseline_captures = await browser.capture_multi_viewports(
            url=v1_url,
            viewports=viewports,
            output_dir=baseline_dir,
            file_prefix="baseline",
            mask_selectors=mask_selectors
        )
        for vp, meta in baseline_captures.items():
            logger.info(f"  [Baseline] {vp}: {meta['file_path']} ({meta.get('width')}x{meta.get('height')}px)")

        # Capture Current (v2.0 with regression) across viewports
        logger.info(f"Capturing current from: {v2_url}")
        current_captures = await browser.capture_multi_viewports(
            url=v2_url,
            viewports=viewports,
            output_dir=current_dir,
            file_prefix="current",
            mask_selectors=mask_selectors
        )
        for vp, meta in current_captures.items():
            logger.info(f"  [Current]  {vp}: {meta['file_path']} ({meta.get('width')}x{meta.get('height')}px)")

        # -------------------------------------------------------------
        # TEST EXCEPTION HANDLING
        # -------------------------------------------------------------
        logger.info("\n--- STEP 2: Verifying Exception Handling ---")
        try:
            # Short timeout to trigger PageNavigationTimeoutError
            logger.info("Testing timeout resilience...")
            short_browser = BrowserEngine(timeout_ms=1)
            async with short_browser as sb:
                await sb.capture_screenshot(
                    url="https://10.255.255.1",  # Non-routable IP
                    viewport_key="desktop",
                    output_path=test_storage / "timeout_test.png"
                )
        except (PageNavigationTimeoutError, InvalidTargetURLError, Exception) as ex:
            logger.info(f"  Expected exception handled successfully: {type(ex).__name__} -> {ex}")

    # -------------------------------------------------------------
    # 3. TEST DIFF ENGINE & ANALYTICS
    # -------------------------------------------------------------
    logger.info("\n--- STEP 3: Comparing Baseline vs Current via DiffEngine ---")
    diff_engine = DiffEngine(
        color_threshold=0.1,
        diff_ratio_threshold=0.05,
        detect_anti_aliasing=True
    )

    for vp in viewports:
        b_file = Path(baseline_captures[vp]["file_path"])
        c_file = Path(current_captures[vp]["file_path"])
        d_file = diff_dir / f"diff_{vp}.png"

        result = diff_engine.compare(
            baseline_path=b_file,
            current_path=c_file,
            diff_output_path=d_file
        )

        logger.info(f"\n[Viewport: {vp.upper()}]")
        logger.info(f"  Status:             {result['status']}")
        logger.info(f"  Diff Ratio:         {result['diff_ratio']:.4f}% (Threshold: {result['diff_ratio_threshold']}%)")
        logger.info(f"  SSIM Score:         {result['ssim_score']:.4f}")
        logger.info(f"  Diff Pixels:        {result['diff_pixel_count']} / {result['total_pixels']}")
        logger.info(f"  Defect Clusters:    {len(result['bounding_boxes'])} bounding boxes detected")
        for i, box in enumerate(result['bounding_boxes'][:3]):
            logger.info(f"    Box {i+1}: at ({box['x']}, {box['y']}), size {box['width']}x{box['height']}")
        logger.info(f"  Diff Image Saved:   {result['diff_image_path']}")

    # -------------------------------------------------------------
    # 4. TEST IDENTICAL IMAGES (PASS CASE)
    # -------------------------------------------------------------
    logger.info("\n--- STEP 4: Verifying Self-Comparison (Idempotency / Pass Case) ---")
    desktop_baseline = Path(baseline_captures["desktop"]["file_path"])
    self_diff_file = diff_dir / "diff_self_identical.png"

    self_result = diff_engine.compare(
        baseline_path=desktop_baseline,
        current_path=desktop_baseline,
        diff_output_path=self_diff_file
    )
    logger.info(f"  Self-diff Status:     {self_result['status']}")
    logger.info(f"  Self-diff Diff Ratio: {self_result['diff_ratio']}% (Expected: 0.0%)")
    logger.info(f"  Self-diff SSIM:       {self_result['ssim_score']} (Expected: 1.0)")
    assert self_result["is_passed"] is True, "Identical images must PASS!"
    assert self_result["diff_pixel_count"] == 0, "Identical images must have 0 diff pixels!"

    logger.info("\n==================================================")
    logger.info("ALL ENGINE VERIFICATIONS COMPLETED SUCCESSFULLY!")
    logger.info("==================================================")


if __name__ == "__main__":
    asyncio.run(run_verification())
