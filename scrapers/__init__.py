"""
Scrapers package for collecting domestic Indian airfares across leading OTAs and direct carriers.
"""
from .base import BaseScraper
from .makemytrip import MakeMyTripScraper
from .easemytrip import EaseMyTripScraper
from .cleartrip import CleartripScraper
from .ixigo import IxigoScraper
from .yatra import YatraScraper
from .indigo_direct import IndiGoDirectScraper
from .mock_engine import RealisticAirfareMockEngine

__all__ = [
    "BaseScraper",
    "MakeMyTripScraper",
    "EaseMyTripScraper",
    "CleartripScraper",
    "IxigoScraper",
    "YatraScraper",
    "IndiGoDirectScraper",
    "RealisticAirfareMockEngine",
]
