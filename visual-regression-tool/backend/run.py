"""
Backend Launcher Script
Starts Uvicorn server for the Visual Regression Tool.
"""

import sys
from pathlib import Path
import uvicorn

# Add backend directory to Python path
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from app.core.config import settings

if __name__ == "__main__":
    print(f"Starting Visual Regression Backend on http://{settings.HOST}:{settings.PORT}")
    print(f"Interactive Swagger Documentation: http://localhost:{settings.PORT}/docs")
    print(f"Demo Sites Baseline (v1.0): http://localhost:{settings.PORT}/demo/v1_baseline/index.html")
    print(f"Demo Sites Regression (v2.0): http://localhost:{settings.PORT}/demo/v2_regression/index.html")
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=False
    )
