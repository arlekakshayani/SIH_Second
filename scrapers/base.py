"""
Abstract Base Scraper for Airline and OTA Portals.
Implements ethical scraping guidelines: randomized jitter, header hygiene, and rate-limiting.
"""
import abc
import asyncio
import random
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import urllib.robotparser
from pipeline.schema import SearchTask, AirfareObservation


USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.88 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36"
]

CARRIER_MAP = {
    "6E": "IndiGo",
    "AI": "Air India",
    "IX": "Air India Express",
    "QP": "Akasa Air",
    "SG": "SpiceJet"
}


class BaseScraper(abc.ABC):
    """Base class for all portal and aggregator scrapers."""

    def __init__(
        self,
        name: str,
        base_url: str,
        min_jitter_sec: float = 3.0,
        max_jitter_sec: float = 6.0,
        enable_mock_fallback: bool = True
    ):
        self.name = name
        self.base_url = base_url
        self.min_jitter = min_jitter_sec
        self.max_jitter = max_jitter_sec
        self.enable_mock_fallback = enable_mock_fallback
        self.live_mode = False
        self.disable_jitter = False

    def get_random_headers(self) -> Dict[str, str]:
        """Generates authentic browser headers to avoid naive bot flagging."""
        return {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept-Encoding": "gzip, deflate, br",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin"
        }

    async def apply_ethical_delay(self):
        """Asynchronous jitter between queries to respect target server load."""
        if self.disable_jitter:
            return
        delay = random.uniform(self.min_jitter, self.max_jitter)
        await asyncio.sleep(delay)

    def normalize_quote(
        self,
        task: SearchTask,
        raw_flight: Dict[str, Any]
    ) -> Optional[AirfareObservation]:
        """
        Converts extracted flight dictionary into an AirfareObservation.
        """
        try:
            carrier_code = str(raw_flight.get("airline_code", "6E")).upper().strip()
            airline_name = raw_flight.get("airline_name") or CARRIER_MAP.get(carrier_code, carrier_code)
            
            flight_no = str(raw_flight.get("flight_number", "101")).replace(" ", "").upper()
            if not flight_no.startswith(carrier_code):
                flight_no = f"{carrier_code}-{flight_no}"

            dep_time = str(raw_flight.get("departure_time", "08:00"))[:5]
            arr_time = str(raw_flight.get("arrival_time", "10:15"))[:5]

            total = float(raw_flight.get("total_fare", 0.0))
            base = float(raw_flight.get("base_fare", 0.0))
            taxes = float(raw_flight.get("total_taxes_fees", total - base if total > base else 800.0))
            if base <= 0 and total > taxes:
                base = total - taxes

            stops = int(raw_flight.get("stops", 0))

            obs = AirfareObservation(
                observation_date=task.observation_date,
                observation_timestamp=task.observation_timestamp,
                departure_date=task.departure_date,
                departure_time=dep_time,
                arrival_time=arr_time,
                duration_minutes=int(raw_flight.get("duration_minutes", 130)),
                origin=task.origin,
                destination=task.destination,
                route_code=f"{task.origin}-{task.destination}",
                airline_code=carrier_code,
                airline_name=airline_name,
                flight_number=flight_no,
                cabin="Economy",
                fare_type=raw_flight.get("fare_type", "Economy/basic"),
                stops=stops,
                is_nonstop=(stops == 0),
                base_fare=base,
                fuel_surcharge_yq=float(raw_flight.get("fuel_surcharge_yq", 0.0)),
                user_development_fee_udf=float(raw_flight.get("user_development_fee_udf", 0.0)),
                passenger_service_fee_psf=float(raw_flight.get("passenger_service_fee_psf", 0.0)),
                gst=float(raw_flight.get("gst", 0.0)),
                convenience_fee=float(raw_flight.get("convenience_fee", 0.0)),
                total_taxes_fees=taxes,
                total_fare=total,
                currency="INR",
                advance_days=task.advance_days,
                data_source=self.name,
                availability=raw_flight.get("availability", "Available")
            )
            return obs
        except Exception as e:
            # Skip corrupted quote gracefully
            return None

    @abc.abstractmethod
    async def search(self, task: SearchTask) -> List[AirfareObservation]:
        """Executes flight search for the given origin, destination, and horizon."""
        pass
