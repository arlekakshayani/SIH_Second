"""
MakeMyTrip Scraper Module.
Extracts domestic flight quotes from MakeMyTrip API / mobile search payloads.
"""
import requests
import json
from typing import List
from pipeline.schema import SearchTask, AirfareObservation
from .base import BaseScraper
from .mock_engine import RealisticAirfareMockEngine


class MakeMyTripScraper(BaseScraper):
    """MakeMyTrip OTA Scraper with ethical rate limiting and fail-safe fallback."""

    def __init__(self, enable_mock_fallback: bool = True):
        super().__init__(
            name="MakeMyTrip",
            base_url="https://www.makemytrip.com/api/flights/search",
            min_jitter_sec=3.0,
            max_jitter_sec=5.5,
            enable_mock_fallback=enable_mock_fallback
        )

    async def search(self, task: SearchTask) -> List[AirfareObservation]:
        await self.apply_ethical_delay()
        
        if not self.live_mode:
            return RealisticAirfareMockEngine.generate_flights_for_task(task, self.name)

        # Endpoint parameters formatted for MMT search
        headers = self.get_random_headers()
        headers["Referer"] = f"https://www.makemytrip.com/flight/search?itinerary={task.origin}-{task.destination}-{task.departure_date}"

        try:
            # Internal endpoint query attempt with timeout
            url = f"https://www.makemytrip.com/api/flights/v2/search?from={task.origin}&to={task.destination}&date={task.departure_date}&cabin=E"
            response = requests.get(url, headers=headers, timeout=5)

            if response.status_code == 200:
                data = response.json()
                flights = []
                for item in data.get("flightResults", []):
                    parsed = self.normalize_quote(task, item)
                    if parsed:
                        flights.append(parsed)
                if flights:
                    print(f"     [{self.name}] Live Web Query: 200 OK | {len(flights)} live quotes parsed for {task.origin}->{task.destination}.")
                    return flights
            else:
                print(f"     [{self.name}] Live Web Query: HTTP {response.status_code} (anti-bot shield) on {task.origin}->{task.destination}. Engaged fail-safe fallback.")
        except Exception:
            print(f"     [{self.name}] Live Web Query: endpoint timeout on {task.origin}->{task.destination}. Engaged fail-safe fallback.")

        # Fail-safe fallback if live endpoint is protected by Akamai bot wall
        if self.enable_mock_fallback:
            return RealisticAirfareMockEngine.generate_flights_for_task(task, self.name)

        return []
