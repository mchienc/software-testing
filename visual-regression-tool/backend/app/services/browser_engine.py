"""
Browser Automation & Anti-Flakiness Engine
Module 1: Headless Chromium screenshot capture via Playwright Async API.
Implements multi-viewport emulation, CSS freeze injection, web font synchronization,
and dynamic element masking to eliminate False Positives (Flaky Tests).
"""

import asyncio
import time
from pathlib import Path
from typing import Dict, List, Optional, Any
from playwright.async_api import (
    async_playwright,
    Browser,
    BrowserContext,
    Page,
    Playwright,
    TimeoutError as PlaywrightTimeoutError,
    Error as PlaywrightError
)

from app.core.constants import VIEWPORT_PRESETS, ANTI_FLAKINESS_CSS
from app.core.logger import logger


class BrowserEngineError(Exception):
    """Base exception for Browser Engine failures."""
    pass


class PageNavigationTimeoutError(BrowserEngineError):
    """Raised when page navigation exceeds configured timeout."""
    pass


class InvalidTargetURLError(BrowserEngineError):
    """Raised when target URL is malformed or unreachable."""
    pass


class BrowserEngine:
    """
    Asynchronous Playwright Headless Browser Controller.
    Manages browser lifecycle, responsive emulation, and anti-flakiness mechanisms.
    """

    def __init__(self, headless: bool = True, timeout_ms: int = 30000):
        self.headless = headless
        self.timeout_ms = timeout_ms
        self._playwright: Optional[Playwright] = None
        self._browser: Optional[Browser] = None

    async def __aenter__(self):
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()

    async def start(self) -> None:
        """Initializes Playwright and launches the headless Chromium instance."""
        if not self._playwright:
            try:
                self._playwright = await async_playwright().start()
                # Chromium launch flags to optimize headless rendering consistency
                launch_args = [
                    "--disable-animations",
                    "--disable-dev-shm-usage",
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-web-security",
                    "--font-render-hinting=none",  # Standardize font antialiasing across environments
                ]
                self._browser = await self._playwright.chromium.launch(
                    headless=self.headless,
                    args=launch_args
                )
                logger.info("Chromium headless engine started successfully.")
            except Exception as e:
                logger.error(f"Failed to start Playwright Chromium: {str(e)}")
                await self.close()
                raise BrowserEngineError(f"Could not launch browser: {str(e)}") from e

    async def close(self) -> None:
        """Safely shuts down browser and terminates Playwright daemon."""
        if self._browser:
            try:
                await self._browser.close()
            except Exception as e:
                logger.warning(f"Error closing browser: {str(e)}")
            finally:
                self._browser = None

        if self._playwright:
            try:
                await self._playwright.stop()
            except Exception as e:
                logger.warning(f"Error stopping playwright: {str(e)}")
            finally:
                self._playwright = None
        logger.info("Browser engine closed.")

    async def _create_context_for_viewport(
        self,
        viewport_key: str
    ) -> BrowserContext:
        """
        Creates an isolated browser context configured with viewport dimensions,
        device scale factor, and user agent.
        """
        if not self._browser:
            await self.start()

        preset = VIEWPORT_PRESETS.get(viewport_key)
        if not preset:
            raise ValueError(f"Unknown viewport preset: '{viewport_key}'. Supported: {list(VIEWPORT_PRESETS.keys())}")

        context_options: Dict[str, Any] = {
            "viewport": {
                "width": preset["width"],
                "height": preset["height"]
            },
            "device_scale_factor": preset.get("device_scale_factor", 1),
            "is_mobile": preset.get("is_mobile", False),
            "has_touch": preset.get("has_touch", False),
            "bypass_csp": True,
            # Normalize user-agent to avoid unexpected UA-dependent variant shifts
            "user_agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 VisualRegressionBot/1.0"
            ),
        }

        context = await self._browser.new_context(**context_options)
        return context

    async def _apply_anti_flakiness(self, page: Page) -> None:
        """
        Injects CSS to disable all transitions, CSS animations, and blinking carets.
        Ensures stable DOM paint before capturing screenshot.
        """
        try:
            await page.add_style_tag(content=ANTI_FLAKINESS_CSS)
            logger.debug("Anti-flakiness CSS injected successfully.")
        except Exception as e:
            logger.warning(f"Failed to inject anti-flakiness CSS: {str(e)}")

    async def _wait_for_page_stability(self, page: Page) -> None:
        """
        Ensures web fonts are completely loaded and waits for network idle state.
        Falls back smoothly if networkidle times out due to persistent websockets/streaming.
        """
        # 1. Wait for document.fonts.ready
        try:
            await page.evaluate("() => document.fonts ? document.fonts.ready : Promise.resolve()")
            logger.debug("Web fonts resolved.")
        except Exception as e:
            logger.debug(f"Font synchronization bypassed: {str(e)}")

        # 2. Wait for networkidle (with safe timeout fallback)
        try:
            await page.wait_for_load_state("networkidle", timeout=5000)
        except PlaywrightTimeoutError:
            logger.debug("Network idle timed out (possible analytics/websocket polling), proceeding with load state.")
            try:
                await page.wait_for_load_state("load", timeout=5000)
            except Exception:
                pass

        # 3. Small settling delay for layout stabilization
        await asyncio.sleep(0.3)

    async def _apply_masking(self, page: Page, mask_selectors: List[str]) -> None:
        """
        Masks dynamic UI elements (timestamps, advertisements, live counters)
        by painting them solid black to preserve layout geometry while preventing
        perceptual diff False Positives.
        """
        if not mask_selectors:
            return

        mask_js = """
        (selectors) => {
            selectors.forEach(sel => {
                const elements = document.querySelectorAll(sel);
                elements.forEach(el => {
                    el.style.setProperty('background-color', '#000000', 'important');
                    el.style.setProperty('color', 'transparent', 'important');
                    el.style.setProperty('border-color', '#000000', 'important');
                    el.style.setProperty('filter', 'none', 'important');
                    // Hide inner children visibility if complex component
                    Array.from(el.children).forEach(child => {
                        child.style.setProperty('visibility', 'hidden', 'important');
                    });
                });
            });
        }
        """
        try:
            await page.evaluate(mask_js, mask_selectors)
            logger.info(f"Masked {len(mask_selectors)} dynamic selector patterns: {mask_selectors}")
        except Exception as e:
            logger.warning(f"Failed to apply element masks: {str(e)}")

    async def capture_screenshot(
        self,
        url: str,
        viewport_key: str,
        output_path: Path,
        mask_selectors: Optional[List[str]] = None,
        full_page: bool = True
    ) -> Dict[str, Any]:
        """
        Executes an end-to-end capture session for a given URL and viewport preset.

        Parameters:
            url (str): Target web address (e.g. 'https://staging.example.com' or 'http://localhost:8000')
            viewport_key (str): 'desktop' | 'tablet' | 'mobile'
            output_path (Path): Destination filesystem path for the screenshot
            mask_selectors (List[str]): CSS selectors of dynamic elements to mask
            full_page (bool): True to capture entire scrollable page height

        Returns:
            Dict containing capture metadata (dimensions, execution time, path).
        """
        start_time = time.time()
        context = await self._create_context_for_viewport(viewport_key)
        page = await context.new_page()

        try:
            logger.info(f"Navigating to '{url}' [{viewport_key}]...")
            # Navigate with domcontentloaded as minimum threshold
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=self.timeout_ms)
            except PlaywrightTimeoutError as te:
                raise PageNavigationTimeoutError(f"Navigation timed out after {self.timeout_ms}ms on {url}") from te
            except PlaywrightError as pe:
                raise InvalidTargetURLError(f"Cannot reach target URL '{url}': {str(pe)}") from pe

            # Apply Anti-Flakiness measures
            await self._apply_anti_flakiness(page)
            await self._wait_for_page_stability(page)

            # Apply Dynamic Element Masking if configured
            if mask_selectors:
                await self._apply_masking(page, mask_selectors)

            # Ensure parent directories exist
            output_path.parent.mkdir(parents=True, exist_ok=True)

            # Capture Full-Page Screenshot
            await page.screenshot(
                path=str(output_path),
                full_page=full_page,
                type="png"
            )

            # Retrieve actual rendered layout dimensions
            dimensions = await page.evaluate(
                "() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight })"
            )

            capture_duration = time.time() - start_time
            logger.info(
                f"Screenshot captured: {output_path.name} [{viewport_key}] "
                f"({dimensions['width']}x{dimensions['height']}px) in {capture_duration:.2f}s"
            )

            return {
                "file_path": str(output_path),
                "viewport": viewport_key,
                "width": dimensions.get("width"),
                "height": dimensions.get("height"),
                "duration_seconds": round(capture_duration, 3),
            }

        except Exception as e:
            logger.error(f"Error capturing screenshot for {url} [{viewport_key}]: {str(e)}")
            raise
        finally:
            # Ensure page and context resources are properly freed
            await page.close()
            await context.close()

    async def capture_multi_viewports(
        self,
        url: str,
        viewports: List[str],
        output_dir: Path,
        file_prefix: str = "capture",
        mask_selectors: Optional[List[str]] = None
    ) -> Dict[str, Dict[str, Any]]:
        """
        Executes sequential captures across requested viewports for a test suite.
        Returns a mapping of viewport_key -> capture result metadata.
        """
        results = {}
        for vp in viewports:
            file_name = f"{file_prefix}_{vp}.png"
            file_path = output_dir / file_name
            try:
                res = await self.capture_screenshot(
                    url=url,
                    viewport_key=vp,
                    output_path=file_path,
                    mask_selectors=mask_selectors,
                    full_page=True
                )
                results[vp] = res
            except Exception as e:
                results[vp] = {
                    "file_path": None,
                    "viewport": vp,
                    "error": str(e),
                    "success": False
                }
        return results
