"""
Pipeline package for Real-Time Airfare Price Index (APIx).
Handles matrix generation, schema validation, data cleaning, and preprocessing.
"""
from .schema import AirfareObservation, RawFlightQuote, SearchTask
from .matrix import RouteMatrixGenerator
from .cleaner import AirfareDataCleaner

__all__ = [
    "AirfareObservation",
    "RawFlightQuote",
    "SearchTask",
    "RouteMatrixGenerator",
    "AirfareDataCleaner",
]
