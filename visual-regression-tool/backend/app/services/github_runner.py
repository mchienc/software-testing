"""
GitHub Repository Visual Regression Runner
Module: app/services/github_runner.py

Clones/fetches any public GitHub repository, locates its web UI bundle or HTML entry,
serves it over an ephemeral local HTTP server, and executes multi-viewport Playwright
visual regression comparisons between two commits (or with simulated CSS regression).
"""

import functools
import http.server
import re
import shutil
import socketserver
import subprocess
import threading
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

from app.core.config import settings
from app.core.constants import VIEWPORT_PRESETS
from app.core.logger import logger
from app.models.schemas import TestSuiteCreate
from app.services.browser_engine import BrowserEngine
from app.services.diff_engine import DiffEngine
from app.services.reporter import ReportGenerator
from app.services.storage_manager import storage_manager


REPOS_CACHE_DIR = settings.STORAGE_PATH / "repos_cache"
REPOS_CACHE_DIR.mkdir(parents=True, exist_ok=True)


def parse_github_slug(repo_url: str) -> str:
    """Extracts 'owner/repo' from a GitHub URL or slug."""
    cleaned = repo_url.strip().rstrip("/")
    if cleaned.endswith(".git"):
        cleaned = cleaned[:-4]
    m = re.search(r"github\.com[:/]([^/]+/[^/]+)", cleaned, re.IGNORECASE)
    if m:
        return m.group(1)
    if re.match(r"^[^/]+/[^/]+$", cleaned):
        return cleaned
    raise ValueError(f"Đường dẫn GitHub không hợp lệ: {repo_url}")


def _run_git(args: List[str], cwd: Path, timeout: int = 120) -> str:
    """Runs a git command and returns stdout."""
    proc = subprocess.run(
        ["git"] + args,
        cwd=str(cwd),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"Git error ({' '.join(args)}): {proc.stderr.strip()}")
    return proc.stdout.strip()


def prepare_local_repo(repo_url: str) -> Tuple[str, Path]:
    """Clones or updates the target GitHub repository in REPOS_CACHE_DIR."""
    slug = parse_github_slug(repo_url)
    clone_url = f"https://github.com/{slug}.git"
    safe_dir_name = slug.replace("/", "__")
    repo_dir = REPOS_CACHE_DIR / safe_dir_name

    if not (repo_dir / ".git").exists():
        if repo_dir.exists():
            shutil.rmtree(repo_dir, ignore_errors=True)
        repo_dir.parent.mkdir(parents=True, exist_ok=True)
        logger.info(f"Cloning GitHub repository {clone_url} -> {repo_dir}...")
        subprocess.run(
            ["git", "clone", "--depth", "25", clone_url, str(repo_dir)],
            capture_output=True,
            text=True,
            timeout=180,
            check=True,
        )
    else:
        logger.info(f"Fetching latest commits for cached repo {slug}...")
        try:
            _run_git(["fetch", "--depth", "25", "origin"], cwd=repo_dir, timeout=60)
        except Exception as e:
            logger.warning(f"Git fetch warning: {e}")

    return slug, repo_dir


def find_web_root_in_repo(repo_dir: Path) -> Tuple[Path, str]:
    """
    Locates the best static web root inside a cloned repository that contains index.html.
    Returns (directory_to_serve, relative_path_to_index_html).
    """
    priority_candidates = [
        repo_dir / "frontend" / "dist",
        repo_dir / "visual-regression-tool" / "frontend" / "dist",
        repo_dir / "dist",
        repo_dir / "build",
        repo_dir / "out",
        repo_dir / "public",
        repo_dir,
        repo_dir / "frontend",
    ]

    for cand in priority_candidates:
        idx = cand / "index.html"
        if idx.exists():
            # Verify it's not an unbuilt Vite template that only has <script type="module" src="/src/main...">
            content = idx.read_text(encoding="utf-8", errors="ignore")
            if "/src/main." not in content or cand.name in ("dist", "build", "out"):
                return cand, "index.html"

    # Search any index.html in repo (excluding node_modules and .git)
    for idx_path in repo_dir.rglob("index.html"):
        parts = idx_path.parts
        if "node_modules" in parts or ".git" in parts:
            continue
        content = idx_path.read_text(encoding="utf-8", errors="ignore")
        if "/src/main." not in content:
            return idx_path.parent, "index.html"

    # Fallback to any index.html found
    for idx_path in repo_dir.rglob("index.html"):
        if "node_modules" not in idx_path.parts and ".git" not in idx_path.parts:
            return idx_path.parent, "index.html"

    raise FileNotFoundError(
        f"Không tìm thấy file giao diện web (index.html / dist) trong kho code GitHub này."
    )


class _SPAHttpRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Quiet static file handler with SPA fallback to index.html."""

    def log_message(self, format, *args):
        pass


class EphemeralStaticServer:
    """Context manager that serves a local directory on an ephemeral localhost port."""

    def __init__(self, directory: Path):
        self.directory = directory
        self.httpd = None
        self.thread = None
        self.port = None

    def __enter__(self) -> str:
        handler = functools.partial(_SPAHttpRequestHandler, directory=str(self.directory))
        socketserver.TCPServer.allow_reuse_address = True
        self.httpd = socketserver.TCPServer(("127.0.0.1", 0), handler)
        self.port = self.httpd.server_address[1]
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()
        return f"http://127.0.0.1:{self.port}"

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.httpd:
            self.httpd.shutdown()
            self.httpd.server_close()


CSS_REGRESSION_MUTATION = """
/* Simulated UI Regression Bug on Target Project for CI/CD Gatekeeper Verification */
button, a.btn, [role="button"], input[type="submit"], .btn {
    background-color: #e11d48 !important;
    background-image: none !important;
    color: #ffffff !important;
    transform: translateY(12px) scale(1.03) !important;
    border: 2px solid #fda4af !important;
    box-shadow: 0 8px 20px rgba(225, 29, 72, 0.45) !important;
}
h1, h2, h3 {
    letter-spacing: 2.5px !important;
    margin-top: 18px !important;
    color: #f43f5e !important;
}
input, select, textarea {
    border-color: #e11d48 !important;
    background-color: rgba(225, 29, 72, 0.08) !important;
}
nav, header, form, .card {
    border-top: 4px solid #e11d48 !important;
}
"""


async def execute_github_repo_visual_test(
    repo_url: str,
    baseline_commit: Optional[str] = None,
    current_commit: Optional[str] = None,
    inject_regression: bool = False,
    viewports: Optional[List[str]] = None,
    threshold: float = 0.05,
) -> Dict[str, Any]:
    """
    Clones the specified GitHub repository, renders its web interface at baseline_commit
    vs current_commit (optionally injecting a CSS regression mutation to demonstrate
    defect detection on the user's own project), and runs the full Perceptual Diff + SSIM pipeline.
    """
    start_time = time.time()
    started_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    viewports = viewports or ["desktop", "tablet", "mobile"]

    slug, repo_dir = prepare_local_repo(repo_url)

    # Resolve commits if not provided
    log_out = _run_git(["log", "-n", "10", "--pretty=format:%H|%h|%s"], cwd=repo_dir)
    commits = []
    for line in log_out.splitlines():
        parts = line.split("|", 2)
        if len(parts) == 3:
            commits.append({"full": parts[0], "short": parts[1], "message": parts[2]})

    if not commits:
        raise RuntimeError(f"Không đọc được lịch sử commit của repo {slug}.")

    curr_sha = current_commit or commits[0]["short"]
    if inject_regression and not baseline_commit:
        base_sha = curr_sha
    else:
        base_sha = baseline_commit or (commits[1]["short"] if len(commits) > 1 else commits[0]["short"])

    mode_label = (
        "Giả lập lỗi CSS trên dự án"
        if inject_regression
        else f"Commit {base_sha[:7]} vs {curr_sha[:7]}"
    )
    suite_name = f"GitHub CI: {slug} ({mode_label})"

    # Create or reuse suite in storage_manager
    existing_suite = None
    for s in storage_manager.list_suites():
        if s.get("name") == suite_name:
            existing_suite = s
            break

    if existing_suite:
        suite = existing_suite
    else:
        suite = storage_manager.create_suite(
            TestSuiteCreate(
                name=suite_name,
                url=f"https://github.com/{slug}@{curr_sha[:7]}",
                baseline_url=f"https://github.com/{slug}@{base_sha[:7]}",
                viewports=viewports,
                threshold=threshold,
                color_threshold=0.1,
                mask_selectors=[".timestamp"],
            )
        )

    suite_id = suite["id"]
    run_id = str(uuid.uuid4())[:8]

    suite_baseline_dir = settings.BASELINES_PATH / suite_id
    run_storage_dir = settings.STORAGE_PATH / "runs" / run_id
    run_currents_dir = run_storage_dir / "currents"
    run_diffs_dir = run_storage_dir / "diffs"

    for d in [suite_baseline_dir, run_currents_dir, run_diffs_dir]:
        d.mkdir(parents=True, exist_ok=True)

    async with BrowserEngine(headless=True) as browser:
        # 1. Checkout Baseline Commit & Capture Baseline Screenshots
        try:
            _run_git(["checkout", "-f", base_sha], cwd=repo_dir)
        except Exception:
            _run_git(["checkout", "-f", commits[0]["full"]], cwd=repo_dir)

        web_root_base, rel_idx_base = find_web_root_in_repo(repo_dir)
        logger.info(f"[{slug}] Serving Baseline ({base_sha[:7]}) from {web_root_base}...")

        with EphemeralStaticServer(web_root_base) as base_server_url:
            target_base_url = f"{base_server_url}/{rel_idx_base}"
            for vp in viewports:
                b_path = suite_baseline_dir / f"baseline_{vp}.png"
                await browser.capture_screenshot(
                    url=target_base_url,
                    viewport_key=vp,
                    output_path=b_path,
                    mask_selectors=[".timestamp"],
                )
        storage_manager.update_suite_has_baseline(suite_id, True)

        # 2. Checkout Current Commit & Capture Current Screenshots
        try:
            _run_git(["checkout", "-f", curr_sha], cwd=repo_dir)
        except Exception:
            _run_git(["checkout", "-f", commits[0]["full"]], cwd=repo_dir)

        web_root_curr, rel_idx_curr = find_web_root_in_repo(repo_dir)
        logger.info(f"[{slug}] Serving Current ({curr_sha[:7]}) from {web_root_curr}...")

        # If inject_regression is True, temporarily inject a <style id="ci-mutation"> into index.html
        idx_file = web_root_curr / rel_idx_curr
        original_html = idx_file.read_text(encoding="utf-8", errors="ignore")
        try:
            if inject_regression:
                mutated_html = original_html.replace(
                    "</head>",
                    f"<style id='ci-regression-mutation'>{CSS_REGRESSION_MUTATION}</style></head>",
                )
                if mutated_html == original_html:
                    mutated_html = f"<style>{CSS_REGRESSION_MUTATION}</style>" + original_html
                idx_file.write_text(mutated_html, encoding="utf-8")

            with EphemeralStaticServer(web_root_curr) as curr_server_url:
                target_curr_url = f"{curr_server_url}/{rel_idx_curr}"
                for vp in viewports:
                    c_path = run_currents_dir / f"current_{vp}.png"
                    await browser.capture_screenshot(
                        url=target_curr_url,
                        viewport_key=vp,
                        output_path=c_path,
                        mask_selectors=[".timestamp"],
                    )
        finally:
            if inject_regression:
                idx_file.write_text(original_html, encoding="utf-8")

    # 3. Compare Baseline vs Current for each viewport
    diff_engine = DiffEngine(
        color_threshold=0.1,
        diff_ratio_threshold=threshold,
        detect_anti_aliasing=True,
    )

    viewport_results: List[Dict[str, Any]] = []
    passed_count = 0
    failed_count = 0

    for vp in viewports:
        vp_start = time.time()
        b_path = suite_baseline_dir / f"baseline_{vp}.png"
        c_path = run_currents_dir / f"current_{vp}.png"
        d_path = run_diffs_dir / f"diff_{vp}.png"

        comparison = diff_engine.compare(
            baseline_path=b_path,
            current_path=c_path,
            diff_output_path=d_path,
        )

        if comparison["is_passed"]:
            passed_count += 1
        else:
            failed_count += 1

        vp_duration_ms = (time.time() - vp_start) * 1000.0
        viewport_results.append({
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
            "duration_ms": round(vp_duration_ms, 2),
        })

    duration_seconds = round(time.time() - start_time, 2)
    overall_status = "PASSED" if failed_count == 0 else "FAILED"

    if failed_count == 0:
        exec_summary = (
            f"Dự án GitHub [{slug}] đạt chuẩn 100% (PASSED) khi so sánh giữa "
            f"commit [{base_sha[:7]}] và [{curr_sha[:7]}]. Giao diện bảo toàn cấu trúc trên cả {len(viewports)} màn hình."
        )
    else:
        distinct_findings = []
        for r in viewport_results:
            for ins in r.get("semantic_insights", []):
                if ins not in distinct_findings:
                    distinct_findings.append(ins)
        findings_str = " ".join(distinct_findings[:3])
        exec_summary = (
            f"Dự án GitHub [{slug}] phát hiện lỗi hồi quy giao diện trên {failed_count}/{len(viewports)} màn hình "
            f"({mode_label}). Tóm tắt thay đổi: {findings_str}"
        )

    served_subpath = (
        str(web_root_curr.relative_to(repo_dir)).replace("\\", "/")
        if web_root_curr != repo_dir
        else "/"
    )

    run_record = {
        "id": run_id,
        "suite_id": suite_id,
        "suite_name": suite_name,
        "target_url": f"https://github.com/{slug} ({mode_label})",
        "github_meta": {
            "repo_slug": slug,
            "repo_url": f"https://github.com/{slug}",
            "baseline_commit": base_sha[:7],
            "current_commit": curr_sha[:7],
            "inject_regression": inject_regression,
            "served_web_root": f"{served_subpath}/{rel_idx_curr}".lstrip("/"),
        },
        "status": "COMPLETED",
        "overall_status": overall_status,
        "executive_summary": exec_summary,
        "started_at": started_at,
        "completed_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "duration_seconds": duration_seconds,
        "total_viewports": len(viewports),
        "passed_viewports": passed_count,
        "failed_viewports": failed_count,
        "results": viewport_results,
    }

    storage_manager.save_run(run_record)
    html_report_path = run_storage_dir / "report.html"
    ReportGenerator.generate_html_report(run_record, html_report_path)

    return run_record
