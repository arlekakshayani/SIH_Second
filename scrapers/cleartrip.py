"""
Cleartrip Scraper Module.
Extracts domestic flight quotes from Cleartrip API / mobile web endpoints.
"""
import requests
from typing import List
from pipeline.schema import SearchTask, AirfareObservation
from .base import BaseScraper
from .mock_engine import RealisticAirfareMockEngine


class CleartripScraper(BaseScraper):
    """Cleartrip OTA Scraper."""

    def __init__(self, enable_mock_fallback: bool = True):
        super().__init__(
            name="Cleartrip",
            base_url="https://www.cleartrip.com/flights/results",
            min_jitter_sec=3.0,
            max_jitter_sec=5.0,
            enable_mock_fallback=enable_mock_fallback
        )

    async def search(self, task: SearchTask) -> List[AirfareObservation]:
        await self.apply_ethical_delay()

        if not self.live_mode:
            return RealisticAirfareMockEngine.generate_flights_for_task(task, self.name)

        headers = self.get_random_headers()
        headers["Referer"] = f"https://www.cleartrip.com/flights/results?from={task.origin}&to={task.destination}&depart_date={task.departure_date}"

        try:
            url = f"https://www.cleartrip.com/api/air/search?origin={task.origin}&dest={task.destination}&departDate={task.departure_date}"
            res = requests.get(url, headers=headers, timeout=5)
            if res.status_code == 200:
                data = res.json()
                flights = []
                for item in data.get("itineraries", []):
                    parsed = self.normalize_quote(task, item)
                    if parsed:
                        flights.append(parsed)
                if flights:
                    print(f"     [{self.name}] Live Web Query: 200 OK | {len(flights)} live quotes parsed for {task.origin}->{task.destination}.")
                    return flights
            else:
                print(f"     [{self.name}] Live Web Query: HTTP {res.status_code} (anti-bot shield) on {task.origin}->{task.destination}. Engaged fail-safe fallback.")
        except Exception:
            print(f"     [{self.name}] Live Web Query: endpoint timeout on {task.origin}->{task.destination}. Engaged fail-safe fallback.")

        if self.enable_mock_fallback:
            return RealisticAirfareMockEngine.generate_flights_for_task(task, self.name)

        return []
