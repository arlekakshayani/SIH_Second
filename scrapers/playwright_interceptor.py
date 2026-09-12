"""
Playwright Network Interceptor for Dynamic Flight SPAs.
Listens to backend JSON responses without relying on brittle DOM selectors.
"""
import asyncio
import json
from typing import List, Dict, Any, Optional
from pipeline.schema import SearchTask, AirfareObservation


class PlaywrightNetworkInterceptor:
    """Uses Playwright headless browser to intercept raw search responses directly from the wire."""

    def __init__(self, headless: bool = True):
        self.headless = headless

    async def intercept_flight_search(
        self,
        portal_url: str,
        response_url_keyword: str = "search",
        timeout_sec: int = 25
    ) -> List[Dict[str, Any]]:
        """
        Navigates to the portal flight page and captures JSON payloads containing response_url_keyword.
        """
        captured_payloads: List[Dict[str, Any]] = []

        try:
            from playwright.async_api import async_playwright
        except ImportError:
            print("[Warning] Playwright not installed. Skipping browser intercept.")
            return captured_payloads

        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=self.headless)
                context = await browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                    viewport={"width": 1280, "height": 800}
                )
                page = await context.new_page()

                async def handle_response(response):
                    if response_url_keyword in response.url and "json" in response.headers.get("content-type", ""):
                        try:
                            payload = await response.json()
                            captured_payloads.append(payload)
                        except Exception:
                            pass

                page.on("response", handle_response)
                
                await page.goto(portal_url, wait_until="networkidle", timeout=timeout_sec * 1000)
                await browser.close()
        except Exception as e:
            print(f"[Interceptor Error] Failed capturing {portal_url}: {e}")

        return captured_payloads
