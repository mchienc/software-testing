"""
Application Constants
Defines presets for viewports, anti-flakiness CSS, default algorithms thresholds,
and visual diff styling.
"""

from typing import Dict, Any

# ==============================================================================
# VIEWPORT PRESETS
# ==============================================================================
# Standard responsive breakpoints representing Desktop, Tablet, and Mobile
VIEWPORT_PRESETS: Dict[str, Dict[str, Any]] = {
    "desktop": {
        "name": "Desktop (1080p)",
        "width": 1920,
        "height": 1080,
        "is_mobile": False,
        "has_touch": False,
        "device_scale_factor": 1,
    },
    "tablet": {
        "name": "Tablet (iPad Portrait)",
        "width": 768,
        "height": 1024,
        "is_mobile": True,
        "has_touch": True,
        "device_scale_factor": 1,
    },
    "mobile": {
        "name": "Mobile (iPhone SE/X Portrait)",
        "width": 375,
        "height": 812,
        "is_mobile": True,
        "has_touch": True,
        "device_scale_factor": 1,
    },
}

# ==============================================================================
# ANTI-FLAKINESS INJECTION CSS
# ==============================================================================
# Neutralizes CSS transitions, keyframe animations, blinking text cursors,
# and smooth scrolling that frequently cause non-deterministic false positives
# (Flaky Tests) in visual regression testing.
ANTI_FLAKINESS_CSS: str = """
*, *::before, *::after {
    -webkit-transition: none !important;
    -moz-transition: none !important;
    -o-transition: none !important;
    -ms-transition: none !important;
    transition: none !important;
    -webkit-animation: none !important;
    -moz-animation: none !important;
    -o-animation: none !important;
    -ms-animation: none !important;
    animation: none !important;
    caret-color: transparent !important;
    scroll-behavior: auto !important;
}
"""

# ==============================================================================
# PERCEPTUAL DIFF & SSIM THRESHOLDS
# ==============================================================================
# Normalized Color Difference Threshold (gamma in [0.0, 1.0])
# 0.1 corresponds to ~10% perceptual delta E in RGB Euclidean space
DEFAULT_COLOR_THRESHOLD: float = 0.1

# Maximum permissible difference ratio (%) before failing the test
# 0.05% allows minor rendering noise (sub-pixel rounding) while catching UI bugs
DEFAULT_DIFF_RATIO_THRESHOLD: float = 0.05

# Anti-Aliasing Detection Sensitivity
AA_CONTRAST_THRESHOLD: float = 0.15

# Color highlight for visual diff (Fluorescent Crimson #FF0055)
# RGB and BGR formats for PIL and OpenCV
DIFF_COLOR_RGB = (255, 0, 85)
DIFF_COLOR_BGR = (85, 0, 255)
DIFF_COLOR_RGBA = (255, 0, 85, 255)

# Bounding box color (Yellow/Amber #FFB800 for high contrast border)
BBOX_COLOR_BGR = (0, 184, 255)
BBOX_THICKNESS = 2
