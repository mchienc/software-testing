"""
Visual Regression Tool - Root Launcher
Allows running directly from visual-regression-tool directory.
"""
import sys
from pathlib import Path
import os

# Set working directory and sys.path to backend directory
BACKEND_DIR = Path(__file__).resolve().parent / "backend"
os.chdir(str(BACKEND_DIR))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import settings
import uvicorn

if __name__ == "__main__":
    print(f"================================================================")
    print(f"  STARTING VISUAL REGRESSION TOOL")
    print(f"================================================================")
    print(f"  Web Dashboard UI:       http://localhost:{settings.PORT}")
    print(f"  Swagger API Docs:       http://localhost:{settings.PORT}/docs")
    print(f"  Demo Baseline (v1.0):   http://localhost:{settings.PORT}/demo/v1_baseline/index.html")
    print(f"  Demo Regression (v2.0): http://localhost:{settings.PORT}/demo/v2_regression/index.html")
    print(f"================================================================\n")
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=False
    )
