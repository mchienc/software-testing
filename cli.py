"""
Workspace Root CLI Entry Point for Automated Visual Regression Testing & CI/CD
Usage:
  python cli.py --help
  python cli.py --list-suites
  python cli.py --capture-baseline
  python cli.py --mode pass --output-html ci_reports/pass_report.html
  python cli.py --mode regression --output-html ci_reports/regression_report.html
"""
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent / "visual-regression-tool" / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.cli import main

if __name__ == "__main__":
    main()
