import os
from pathlib import Path
from typing import Callable, Optional, Tuple


class PlaywrightBrowserManager:
    """Minimal Playwright helper for browser lifecycle and download setup."""

    def __init__(self, downloads_dir: Optional[str] = None, headless: bool = False):
        self.downloads_dir = downloads_dir
        self.headless = headless
        self._playwright = None
        self.browser = None
        self.context = None
        self.page = None

    def _load_playwright(self):
        try:
            from playwright.sync_api import Browser, BrowserContext, Page, sync_playwright
        except ImportError as exc:
            raise RuntimeError("Playwright is not installed") from exc
        return Browser, BrowserContext, Page, sync_playwright

    def start(self) -> Tuple["Browser", "BrowserContext", "Page"]:
        """Start Chromium, create a context and open a fresh page."""
        Browser, BrowserContext, Page, sync_playwright = self._load_playwright()
        self._playwright = sync_playwright().start()
        self.browser = self._playwright.chromium.launch(
            headless=self.headless,
            args=["--start-maximized"],
        )
        self.context = self.browser.new_context(accept_downloads=True, no_viewport=True)

        if self.downloads_dir:
            try:
                Path(self.downloads_dir).mkdir(parents=True, exist_ok=True)
            except Exception:
                pass

        self.page = self.context.new_page()
        return self.browser, self.context, self.page

    def stop(self) -> None:
        """Stop the browser cleanly and release resources."""
        try:
            if self.browser:
                self.browser.close()
        except Exception:
            pass
        try:
            if self._playwright:
                self._playwright.stop()
        except Exception:
            pass

    def register_page_listener(self, callback: Callable) -> None:
        """Register a callback for new page events."""
        if self.context:
            try:
                self.context.on("page", callback)
            except Exception:
                pass


def init_playwright_browsers_path(local_path: str = "ms-playwright") -> None:
    """Set PLAYWRIGHT_BROWSERS_PATH when local browser assets are bundled."""
    path = Path(local_path)
    if path.is_dir():
        os.environ["PLAYWRIGHT_BROWSERS_PATH"] = str(path.resolve())
