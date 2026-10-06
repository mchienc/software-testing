"""
Application Configuration
Handles base directories, storage folder paths, and operational parameters.
"""

from pathlib import Path

# Base paths
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
STORAGE_DIR = BACKEND_DIR / "storage"
BASELINES_DIR = STORAGE_DIR / "baselines"
CURRENTS_DIR = STORAGE_DIR / "currents"
DIFFS_DIR = STORAGE_DIR / "diffs"
DEMO_SITES_DIR = BACKEND_DIR / "demo_sites"

# Ensure runtime directories exist
for path in [STORAGE_DIR, BASELINES_DIR, CURRENTS_DIR, DIFFS_DIR, DEMO_SITES_DIR]:
    path.mkdir(parents=True, exist_ok=True)

class Settings:
    PROJECT_NAME: str = "Automated Visual Regression Testing Tool"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    BACKEND_DIR: Path = BACKEND_DIR
    STORAGE_PATH: Path = STORAGE_DIR
    BASELINES_PATH: Path = BASELINES_DIR
    CURRENTS_PATH: Path = CURRENTS_DIR
    DIFFS_PATH: Path = DIFFS_DIR
    DEMO_SITES_PATH: Path = DEMO_SITES_DIR
    
    # DB File
    DB_PATH: Path = BACKEND_DIR / "visual_regression.db"

settings = Settings()
