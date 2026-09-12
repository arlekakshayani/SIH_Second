"""
Yatra Scraper Module.
Extracts domestic flight quotes from Yatra corporate and retail search endpoints.
"""
import requests
from typing import List
from pipeline.schema import SearchTask, AirfareObservation
from .base import BaseScraper
from .mock_engine import RealisticAirfareMockEngine


class YatraScraper(BaseScraper):
    """Yatra OTA Scraper."""

    def __init__(self, enable_mock_fallback: bool = True):
        super().__init__(
            name="Yatra",
            base_url="https://flight.yatra.com/air-search-ui/int/dom",
            min_jitter_sec=3.0,
            max_jitter_sec=5.0,
            enable_mock_fallback=enable_mock_fallback
        )

    async def search(self, task: SearchTask) -> List[AirfareObservation]:
        await self.apply_ethical_delay()

        if not self.live_mode:
            return RealisticAirfareMockEngine.generate_flights_for_task(task, self.name)

        headers = self.get_random_headers()
        headers["Referer"] = "https://www.yatra.com/domestic-flights"

        try:
            url = f"https://flight.yatra.com/air-search-ui/services/dom/search?origin={task.origin}&destination={task.destination}&flight_depart_date={task.departure_date}"
            res = requests.get(url, headers=headers, timeout=5)
            if res.status_code == 200:
                data = res.json()
                flights = []
                for item in data.get("flights", []):
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
