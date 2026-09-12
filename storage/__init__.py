"""
Storage package for managing persistence of scraped and cleaned airfare observations.
Supports SQLite (local file-based storage), PostgreSQL/TimescaleDB, and high-performance Parquet time-series export.
"""
from .db import DatabaseManager, AirfareObservationModel
from .exporter import DataExporter

__all__ = ["DatabaseManager", "AirfareObservationModel", "DataExporter"]
