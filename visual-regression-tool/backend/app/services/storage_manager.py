"""
Storage & Persistence Manager
Manages test suites metadata, execution history, baseline lifecycle, and image file paths.
"""

import json
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

from app.core.config import settings
from app.core.logger import logger
from app.models.schemas import TestSuite, TestSuiteCreate, TestRunResponse


class StorageManager:
    """Manages metadata persistence and image directory layouts."""

    def __init__(self):
        self.db_dir = settings.STORAGE_PATH / "metadata"
        self.db_dir.mkdir(parents=True, exist_ok=True)
        self.suites_file = self.db_dir / "suites.json"
        self.runs_file = self.db_dir / "runs.json"
        self._init_files()

    def _init_files(self):
        if not self.suites_file.exists():
            self.suites_file.write_text("{}", encoding="utf-8")
        if not self.runs_file.exists():
            self.runs_file.write_text("{}", encoding="utf-8")

    def _read_json(self, path: Path) -> Dict[str, Any]:
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return {}

    def _write_json(self, path: Path, data: Dict[str, Any]):
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    # =========================================================================
    # SUITES MANAGEMENT
    # =========================================================================

    def list_suites(self) -> List[Dict[str, Any]]:
        suites = self._read_json(self.suites_file)
        return list(suites.values())

    def get_suite(self, suite_id: str) -> Optional[Dict[str, Any]]:
        suites = self._read_json(self.suites_file)
        return suites.get(suite_id)

    def create_suite(self, suite_in: TestSuiteCreate) -> Dict[str, Any]:
        suites = self._read_json(self.suites_file)
        suite_id = str(uuid.uuid4())[:8]
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        suite_data = {
            "id": suite_id,
            "name": suite_in.name,
            "url": suite_in.url,
            "baseline_url": suite_in.baseline_url,
            "viewports": suite_in.viewports,
            "threshold": suite_in.threshold,
            "color_threshold": suite_in.color_threshold,
            "mask_selectors": suite_in.mask_selectors,
            "has_baseline": False,
            "created_at": now_str,
            "updated_at": now_str,
        }

        suites[suite_id] = suite_data
        self._write_json(self.suites_file, suites)

        # Create suite storage directories
        suite_baseline_dir = settings.BASELINES_PATH / suite_id
        suite_baseline_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"Created new Test Suite: '{suite_in.name}' [ID: {suite_id}]")
        return suite_data

    def delete_suite(self, suite_id: str) -> bool:
        suites = self._read_json(self.suites_file)
        if suite_id in suites:
            del suites[suite_id]
            self._write_json(self.suites_file, suites)
            # Remove files
            suite_dir = settings.BASELINES_PATH / suite_id
            if suite_dir.exists():
                shutil.rmtree(suite_dir, ignore_errors=True)
            return True
        return False

    def update_suite_has_baseline(self, suite_id: str, has_baseline: bool = True):
        suites = self._read_json(self.suites_file)
        if suite_id in suites:
            suites[suite_id]["has_baseline"] = has_baseline
            suites[suite_id]["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            self._write_json(self.suites_file, suites)

    def get_suite_baselines(self, suite_id: str) -> List[Dict[str, Any]]:
        """Returns metadata and URLs of all baseline images captured for a suite."""
        suite = self.get_suite(suite_id)
        if not suite:
            return []
        suite_baseline_dir = settings.BASELINES_PATH / suite_id
        if not suite_baseline_dir.exists():
            return []

        results = []
        for vp in suite.get("viewports", ["desktop", "tablet", "mobile"]):
            img_path = suite_baseline_dir / f"baseline_{vp}.png"
            if img_path.exists():
                results.append({
                    "viewport": vp,
                    "image_url": f"/storage/baselines/{suite_id}/baseline_{vp}.png",
                    "file_path": str(img_path),
                    "size_bytes": img_path.stat().st_size,
                    "updated_at": datetime.fromtimestamp(img_path.stat().st_mtime).strftime("%Y-%m-%d %H:%M:%S")
                })
        return results

    # =========================================================================
    # RUNS MANAGEMENT
    # =========================================================================

    def list_runs(self, suite_id: Optional[str] = None) -> List[Dict[str, Any]]:
        runs = self._read_json(self.runs_file)
        all_runs = list(runs.values())
        if suite_id:
            all_runs = [r for r in all_runs if r.get("suite_id") == suite_id]
        # Sort newest first
        all_runs.sort(key=lambda x: x.get("started_at", ""), reverse=True)
        return all_runs

    def get_run(self, run_id: str) -> Optional[Dict[str, Any]]:
        runs = self._read_json(self.runs_file)
        return runs.get(run_id)

    def save_run(self, run_data: Dict[str, Any]):
        runs = self._read_json(self.runs_file)
        runs[run_data["id"]] = run_data
        self._write_json(self.runs_file, runs)

    def approve_baseline(self, run_id: str) -> bool:
        """
        Promotes the screenshots from the given run to become the new official
        baseline for its test suite.
        """
        run = self.get_run(run_id)
        if not run:
            return False

        suite_id = run["suite_id"]
        suite_baseline_dir = settings.BASELINES_PATH / suite_id
        suite_baseline_dir.mkdir(parents=True, exist_ok=True)

        # Copy each current viewport screenshot to suite baseline directory
        for r in run.get("results", []):
            vp = r.get("viewport")
            curr_path = r.get("current_file_path")
            if curr_path and Path(curr_path).exists():
                dest_path = suite_baseline_dir / f"baseline_{vp}.png"
                shutil.copy2(curr_path, dest_path)
                logger.info(f"Promoted {vp} image to baseline: {dest_path}")

        self.update_suite_has_baseline(suite_id, True)
        logger.info(f"Successfully approved Run #{run_id} as new baseline for Suite #{suite_id}")
        return True


storage_manager = StorageManager()
