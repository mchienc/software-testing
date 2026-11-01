"""
Automated Visual Regression Testing - Headless CLI Runner & CI/CD Gatekeeper
Module: app/cli.py

Provides command-line execution for local developer workflows and enterprise
CI/CD pipelines (GitHub Actions, GitLab CI, Jenkins).

Exit Codes:
  0 - Visual regression check PASSED (or baseline captured successfully)
  1 - Visual regression check FAILED (Diff Ratio > Threshold)
  2 - Execution or configuration error
"""

import argparse
import asyncio
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

# Ensure UTF-8 console output on Windows PowerShell / CMD
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from app.core.config import settings
from app.core.constants import VIEWPORT_PRESETS
from app.models.schemas import TestSuiteCreate, TestRunTrigger
from app.services.browser_engine import BrowserEngine
from app.services.reporter import ReportGenerator
from app.services.storage_manager import storage_manager
from app.services.test_runner import execute_test_run, resolve_accessible_url


BANNER = r"""
========================================================================================
   ____ixelPulse QA - AUTOMATED VISUAL REGRESSION CLI & CI/CD GATEKEEPER
   Engine: Playwright Headless Chromium | Perceptual Diff (YIQ) + SSIM + OpenCV BBox
========================================================================================
"""


def _print_suites_table(suites: List[Dict[str, Any]]) -> None:
    """Prints a formatted ASCII table of all registered test suites."""
    if not suites:
        print("No test suites found in storage.")
        return

    print(f"{'ID':<10} | {'SUITE NAME':<34} | {'VIEWPORTS':<22} | {'THRESH':<8} | {'BASELINE'}")
    print("-" * 92)
    for s in suites:
        vps = ",".join(s.get("viewports", []))
        has_b = "READY" if s.get("has_baseline") else "MISSING"
        print(
            f"{s['id']:<10} | {s['name'][:34]:<34} | {vps:<22} | "
            f"{s.get('threshold', 0.05):>6.2f}% | {has_b}"
        )
    print("-" * 92)


def _print_run_summary_table(run_record: Dict[str, Any], threshold: float) -> None:
    """Prints a detailed terminal report of the visual regression run."""
    print("\n" + "=" * 88)
    print(f" VISUAL REGRESSION REPORT - RUN #{run_record['id']}")
    print("=" * 88)
    print(f" Suite Name      : {run_record['suite_name']} (ID: {run_record['suite_id']})")
    print(f" Target URL      : {run_record['target_url']}")
    print(f" Duration        : {run_record['duration_seconds']}s")
    print(f" Diff Threshold  : <= {threshold:.4f}%")
    print(f" Overall Status  : [{run_record['overall_status']}] "
          f"({run_record['passed_viewports']}/{run_record['total_viewports']} Viewports Passed)")
    print("-" * 88)
    print(
        f" {'VIEWPORT':<10} | {'RESOLUTION':<13} | {'STATUS':<8} | "
        f"{'DIFF RATIO':<12} | {'SSIM':<8} | {'DEFECTS':<8} | {'DURATION'}"
    )
    print("-" * 88)

    for res in run_record.get("results", []):
        vp = res.get("viewport", "").upper()
        res_dim = f"{res.get('viewport_width', 0)}x{res.get('viewport_height', 0)}"
        status = res.get("status", "ERROR")
        diff_ratio = f"{res.get('diff_ratio', 0.0):.4f}%"
        ssim = f"{res.get('ssim_score', 0.0):.4f}"
        clusters = len(res.get("bounding_boxes", []))
        dur = f"{res.get('duration_ms', 0.0):.0f}ms"
        print(
            f" {vp:<10} | {res_dim:<13} | {status:<8} | "
            f"{diff_ratio:<12} | {ssim:<8} | {clusters:<8} | {dur}"
        )

    print("-" * 88)
    print(f" Executive Summary:\n   {run_record.get('executive_summary', '')}")

    # Print semantic insights per failed viewport
    for res in run_record.get("results", []):
        if res.get("status") != "PASSED":
            vp = res.get("viewport", "").upper()
            print(f"\n [!] Semantic Root-Cause Analysis ({vp}):")
            for ins in res.get("semantic_insights", []):
                print(f"     - {ins}")
            bboxes = res.get("bounding_boxes", [])
            if bboxes:
                print(f"     Detected {len(bboxes)} Defect Bounding Box(es):")
                for idx, box in enumerate(bboxes[:5], 1):
                    print(
                        f"       #{idx} [{box.get('severity', 'MEDIUM')}] "
                        f"{box.get('region_name', 'UI')} - {box.get('defect_type', 'Diff')}: "
                        f"{box.get('description', '')} "
                        f"@ (x={box['x']}, y={box['y']}, {box['width']}x{box['height']}px)"
                    )
    print("=" * 88 + "\n")


def _write_github_step_summary(
    run_record: Dict[str, Any],
    threshold: float,
    summary_path: str
) -> None:
    """
    Writes a rich GitHub Actions Markdown Job Summary to $GITHUB_STEP_SUMMARY.
    """
    overall = run_record.get("overall_status", "UNKNOWN")
    badge = "✅ PASSED" if overall == "PASSED" else "❌ FAILED (REGRESSION DETECTED)"

    lines = [
        f"## 🔍 Automated Visual Regression Report — `{badge}`",
        "",
        f"- **Suite:** `{run_record.get('suite_name')}` (`{run_record.get('suite_id')}`)",
        f"- **Run ID:** `{run_record.get('id')}`",
        f"- **Target URL:** `{run_record.get('target_url')}`",
        f"- **Threshold:** `<= {threshold:.4f}%` | **Duration:** `{run_record.get('duration_seconds')}s`",
        f"- **Executive Summary:** {run_record.get('executive_summary', '')}",
        "",
        "### 📊 Multi-Viewport Perceptual Diff & SSIM Metrics",
        "",
        "| Viewport | Resolution | Status | Diff Ratio (%) | SSIM Score | Diff Pixels | Defect Regions |",
        "| :--- | :---: | :---: | :---: | :---: | :---: | :---: |",
    ]

    for r in run_record.get("results", []):
        vp = r.get("viewport", "").upper()
        dim = f"`{r.get('viewport_width')}x{r.get('viewport_height')}`"
        st = "✅ PASSED" if r.get("status") == "PASSED" else "❌ FAILED"
        dr = f"`{r.get('diff_ratio', 0.0):.4f}%`"
        ssim = f"`{r.get('ssim_score', 0.0):.4f}`"
        dp = f"`{r.get('diff_pixels', 0):,}`"
        boxes = len(r.get("bounding_boxes", []))
        lines.append(f"| **{vp}** | {dim} | {st} | {dr} | {ssim} | {dp} | `{boxes}` |")

    # Add semantic root-cause breakdown if any failures occurred
    failed_vps = [r for r in run_record.get("results", []) if r.get("status") != "PASSED"]
    if failed_vps:
        lines.extend([
            "",
            "### 🧠 Semantic Root-Cause & Layout Shift Analysis",
            ""
        ])
        for r in failed_vps:
            vp = r.get("viewport", "").upper()
            lines.append(f"#### 🖥️ {vp} Viewport (`Diff: {r.get('diff_ratio', 0):.4f}%`, `SSIM: {r.get('ssim_score', 0):.4f}`)")
            for ins in r.get("semantic_insights", []):
                lines.append(f"- {ins}")
            bboxes = r.get("bounding_boxes", [])
            if bboxes:
                lines.extend([
                    "",
                    "| # | Region | Defect Type | Severity | Description | Coordinates |",
                    "| :---: | :--- | :--- | :---: | :--- | :---: |"
                ])
                for i, b in enumerate(bboxes[:8], 1):
                    coords = f"`({b['x']}, {b['y']}) {b['width']}x{b['height']}px`"
                    lines.append(
                        f"| #{i} | **{b.get('region_name', 'UI')}** | {b.get('defect_type', '')} | "
                        f"`{b.get('severity', 'MEDIUM')}` | {b.get('description', '')} | {coords} |"
                    )
            lines.append("")

    summary_file = Path(summary_path)
    summary_file.parent.mkdir(parents=True, exist_ok=True)
    with open(summary_file, "a", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"[CI/CD] Appended Markdown Job Summary to: {summary_file}")


async def _capture_baseline_only(
    suite: Dict[str, Any],
    override_baseline_url: Optional[str] = None
) -> int:
    """Captures clean reference baseline images for all viewports in the suite."""
    suite_id = suite["id"]
    raw_url = override_baseline_url or suite.get("baseline_url") or suite["url"]
    resolved_url = resolve_accessible_url(raw_url)
    viewports = suite.get("viewports", ["desktop", "tablet", "mobile"])
    mask_selectors = suite.get("mask_selectors", [])

    suite_baseline_dir = settings.BASELINES_PATH / suite_id
    suite_baseline_dir.mkdir(parents=True, exist_ok=True)

    print(f"[*] Capturing reference Baseline for Suite '{suite['name']}' (ID: {suite_id})")
    print(f"[*] Baseline Source URL : {resolved_url}")
    print(f"[*] Target Viewports    : {', '.join(viewports)}")

    start_t = time.time()
    async with BrowserEngine(headless=True) as browser:
        for vp in viewports:
            out_path = suite_baseline_dir / f"baseline_{vp}.png"
            await browser.capture_screenshot(
                url=resolved_url,
                viewport_key=vp,
                output_path=out_path,
                mask_selectors=mask_selectors
            )
            size_kb = out_path.stat().st_size / 1024.0
            print(f"  [+] Captured {vp.upper():<8} -> {out_path} ({size_kb:.1f} KB)")

    storage_manager.update_suite_has_baseline(suite_id, True)
    elapsed = round(time.time() - start_t, 2)
    print(f"[SUCCESS] Baseline capture completed in {elapsed}s.\n")
    return 0


def _resolve_or_create_suite(args: argparse.Namespace) -> Dict[str, Any]:
    """Finds an existing suite by ID or creates/updates a CLI suite based on arguments."""
    if args.suite_id:
        existing = storage_manager.get_suite(args.suite_id)
        if not existing:
            raise ValueError(f"Test suite with ID '{args.suite_id}' does not exist.")
        return existing

    # Default demo URLs based on --mode
    default_v1 = (settings.DEMO_SITES_PATH / "v1_baseline" / "index.html").resolve().as_uri()
    default_v2 = (settings.DEMO_SITES_PATH / "v2_regression" / "index.html").resolve().as_uri()

    baseline_url = args.baseline_url or default_v1
    if args.url:
        target_url = args.url
    else:
        target_url = default_v1 if args.mode == "pass" else default_v2

    viewports = [v.strip().lower() for v in args.viewports.split(",") if v.strip()]
    for vp in viewports:
        if vp not in VIEWPORT_PRESETS:
            raise ValueError(
                f"Unsupported viewport '{vp}'. Choose from: {list(VIEWPORT_PRESETS.keys())}"
            )

    masks = [m.strip() for m in args.mask.split(",") if m.strip()]

    # Check if a suite with this name already exists so we can reuse its baseline if desired
    suite_name = args.name or (
        "CI/CD Zero-Diff Verification (v1.0 vs v1.0)"
        if args.mode == "pass" and not args.url
        else "CI/CD Visual Regression Suite (v1.0 vs v2.0)"
    )

    for s in storage_manager.list_suites():
        if s.get("name") == suite_name:
            # Update suite parameters to match CLI flags
            s["url"] = target_url
            s["baseline_url"] = baseline_url
            s["viewports"] = viewports
            s["threshold"] = args.threshold
            s["color_threshold"] = args.color_threshold
            s["mask_selectors"] = masks
            suites_all = storage_manager._read_json(storage_manager.suites_file)
            suites_all[s["id"]] = s
            storage_manager._write_json(storage_manager.suites_file, suites_all)
            return s

    suite_in = TestSuiteCreate(
        name=suite_name,
        url=target_url,
        baseline_url=baseline_url,
        viewports=viewports,
        threshold=args.threshold,
        color_threshold=args.color_threshold,
        mask_selectors=masks,
    )
    return storage_manager.create_suite(suite_in)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="pixelpulse-cli",
        description="Automated Visual Regression Testing CLI & CI/CD Gatekeeper",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  1. List all configured test suites:
     python cli.py --list-suites

  2. Capture reference Baseline screenshots (v1.0):
     python cli.py --capture-baseline

  3. Run Zero-Diff verification (v1.0 vs v1.0 -> returns Exit Code 0):
     python cli.py --mode pass --output-html reports/pass_report.html

  4. Run Visual Regression detection (v1.0 vs v2.0 -> returns Exit Code 1):
     python cli.py --mode regression --output-html reports/regression_report.html --output-json reports/result.json

  5. Test any custom URL against a baseline URL:
     python cli.py --baseline-url https://example.com --url https://example.com --viewports desktop,mobile --threshold 0.1
"""
    )

    parser.add_argument(
        "--list-suites",
        action="store_true",
        help="List all configured test suites in storage and exit."
    )
    parser.add_argument(
        "--suite-id",
        type=str,
        default=None,
        help="Run an existing test suite by its ID."
    )
    parser.add_argument(
        "--name",
        type=str,
        default=None,
        help="Custom name for the CLI test suite."
    )
    parser.add_argument(
        "--mode",
        choices=["regression", "pass"],
        default="regression",
        help="Built-in demo preset: 'regression' compares v1_baseline vs v2_regression (fails with exit code 1); 'pass' compares v1_baseline vs v1_baseline (passes with exit code 0)."
    )
    parser.add_argument(
        "--baseline-url",
        type=str,
        default=None,
        help="Baseline URL or local HTML path (defaults to demo v1_baseline)."
    )
    parser.add_argument(
        "--url",
        type=str,
        default=None,
        help="Target Current URL or local HTML path to test."
    )
    parser.add_argument(
        "--capture-baseline",
        action="store_true",
        help="Only capture/refresh Baseline screenshots and exit 0."
    )
    parser.add_argument(
        "--reset-baseline",
        action="store_true",
        help="Force re-capturing Baseline screenshots before running the comparison."
    )
    parser.add_argument(
        "--approve-latest",
        action="store_true",
        help="Approve and promote the latest test run of the suite as the new Baseline."
    )
    parser.add_argument(
        "--viewports",
        type=str,
        default="desktop,tablet,mobile",
        help="Comma-separated viewports to test (default: desktop,tablet,mobile)."
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.05,
        help="Maximum allowed diff ratio percentage (default: 0.05%%)."
    )
    parser.add_argument(
        "--color-threshold",
        type=float,
        default=0.1,
        help="Per-pixel perceptual color tolerance gamma 0.0-1.0 (default: 0.1)."
    )
    parser.add_argument(
        "--mask",
        type=str,
        default=".timestamp,#live-visitors-counter",
        help="Comma-separated CSS selectors to mask before screenshot capture."
    )
    parser.add_argument(
        "--output-html",
        type=str,
        default=None,
        help="File path to export a standalone HTML report (with embedded Base64 images for CI artifacts)."
    )
    parser.add_argument(
        "--output-json",
        type=str,
        default=None,
        help="File path to export the structured JSON test result."
    )
    parser.add_argument(
        "--github-summary",
        type=str,
        default=None,
        help="File path to write GitHub Actions Markdown Step Summary (defaults to $GITHUB_STEP_SUMMARY if set)."
    )
    parser.add_argument(
        "--no-fail-on-diff",
        action="store_true",
        help="Always exit with code 0 even if visual regression defects are detected."
    )

    return parser


async def async_main(args: argparse.Namespace) -> int:
    print(BANNER)

    if args.list_suites:
        suites = storage_manager.list_suites()
        _print_suites_table(suites)
        return 0

    try:
        suite = _resolve_or_create_suite(args)
    except Exception as e:
        print(f"[ERROR] Configuration Error: {e}", file=sys.stderr)
        return 2

    suite_id = suite["id"]

    # Handle --approve-latest
    if args.approve_latest:
        runs = storage_manager.list_runs(suite_id=suite_id)
        if not runs:
            print(f"[ERROR] No previous runs found for suite '{suite['name']}' ({suite_id}).", file=sys.stderr)
            return 2
        latest_run_id = runs[0]["id"]
        ok = storage_manager.approve_baseline(latest_run_id)
        if ok:
            print(f"[SUCCESS] Approved Run #{latest_run_id} as the new official Baseline for Suite '{suite['name']}'.")
            return 0
        print(f"[ERROR] Failed to approve Run #{latest_run_id}.", file=sys.stderr)
        return 2

    # Handle --capture-baseline
    if args.capture_baseline:
        return await _capture_baseline_only(suite, override_baseline_url=args.baseline_url)

    # Execute visual regression run
    trigger = TestRunTrigger(
        capture_as_baseline=args.reset_baseline,
        override_url=args.url
    )

    run_record = await execute_test_run(suite_id=suite_id, trigger=trigger)
    _print_run_summary_table(run_record, threshold=suite.get("threshold", 0.05))

    # Default report inside storage/runs/<run_id>/report.html
    default_report_path = settings.STORAGE_PATH / "runs" / run_record["id"] / "report.html"
    print(f"[*] Default Run HTML Report : {default_report_path}")

    # Export standalone Base64-embedded HTML report if requested
    if args.output_html:
        out_html = Path(args.output_html).resolve()
        out_html.parent.mkdir(parents=True, exist_ok=True)
        ReportGenerator.generate_html_report(
            run_data=run_record,
            output_file=out_html,
            embed_images_base64=True
        )
        print(f"[*] Standalone CI HTML Report (Base64 Embedded): {out_html}")

    # Export JSON report if requested
    if args.output_json:
        out_json = Path(args.output_json).resolve()
        out_json.parent.mkdir(parents=True, exist_ok=True)
        ReportGenerator.generate_json_report(
            run_data=run_record,
            output_file=out_json
        )
        print(f"[*] Structured CI JSON Report: {out_json}")

    # Write GitHub Step Summary if requested or running in GitHub Actions
    gh_summary_path = args.github_summary or os.environ.get("GITHUB_STEP_SUMMARY")
    if gh_summary_path:
        try:
            _write_github_step_summary(
                run_record=run_record,
                threshold=suite.get("threshold", 0.05),
                summary_path=gh_summary_path
            )
        except Exception as e:
            print(f"[WARN] Could not write GitHub Step Summary: {e}", file=sys.stderr)

    overall_status = run_record.get("overall_status", "FAILED")
    if overall_status == "PASSED":
        print("\n[CI/CD GATE] STATUS: PASSED (Exit Code 0)")
        return 0
    else:
        if args.no_fail_on_diff:
            print("\n[CI/CD GATE] STATUS: FAILED (Exit Code 0 due to --no-fail-on-diff)")
            return 0
        print("\n[CI/CD GATE] STATUS: FAILED - Visual Regression Detected! (Exit Code 1)")
        return 1


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    try:
        exit_code = asyncio.run(async_main(args))
    except KeyboardInterrupt:
        print("\n[!] Interrupted by user.", file=sys.stderr)
        exit_code = 2
    except Exception as e:
        print(f"\n[FATAL ERROR] {e}", file=sys.stderr)
        exit_code = 2
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
