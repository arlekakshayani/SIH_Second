"""
IndiGo Direct Airline Benchmark Scraper.
Extracts direct carrier published tariffs to isolate aggregator convenience markups.
"""
import requests
from typing import List
from pipeline.schema import SearchTask, AirfareObservation
from .base import BaseScraper
from .mock_engine import RealisticAirfareMockEngine


class IndiGoDirectScraper(BaseScraper):
    """IndiGo Direct Carrier Benchmark Scraper."""

    def __init__(self, enable_mock_fallback: bool = True):
        super().__init__(
            name="IndiGo Direct",
            base_url="https://www.goindigo.in/flight-booking",
            min_jitter_sec=3.5,
            max_jitter_sec=5.5,
            enable_mock_fallback=enable_mock_fallback
        )

    async def search(self, task: SearchTask) -> List[AirfareObservation]:
        await self.apply_ethical_delay()

        if not self.live_mode:
            all_flights = RealisticAirfareMockEngine.generate_flights_for_task(task, self.name)
            return [f for f in all_flights if f.airline_code == "6E"]

        headers = self.get_random_headers()
        headers["Referer"] = "https://www.goindigo.in/"

        try:
            url = f"https://www.goindigo.in/api/v1/flightSearch?origin={task.origin}&destination={task.destination}&date={task.departure_date}"
            res = requests.get(url, headers=headers, timeout=5)
            if res.status_code == 200:
                data = res.json()
                flights = []
                for item in data.get("trips", []):
                    # Zero aggregator markup on direct booking
                    item["convenience_fee"] = 0.0
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
            # Filter for IndiGo flights only
            all_flights = RealisticAirfareMockEngine.generate_flights_for_task(task, self.name)
            return [f for f in all_flights if f.airline_code == "6E"]

        return []
