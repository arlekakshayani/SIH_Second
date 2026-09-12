"""
30-Day Historical Airfare Backtest Dataset Generator.
Simulates authentic daily price observations across 25 routes and 5 horizons
to benchmark index convergence against DGCA monthly published tariffs.
"""
from datetime import date, timedelta, datetime, timezone
from typing import List, Optional
import pandas as pd

from pipeline.schema import SearchTask, AirfareObservation
from pipeline.matrix import RouteMatrixGenerator
from pipeline.cleaner import AirfareDataCleaner
from scrapers.mock_engine import RealisticAirfareMockEngine
from storage.db import DatabaseManager
from storage.exporter import DataExporter


class HistoricalDataGenerator:
    """Generates continuous historical daily observations to fulfill 30-day DGCA validation requirement."""

    def __init__(self):
        self.matrix_gen = RouteMatrixGenerator()
        self.cleaner = AirfareDataCleaner()
        self.db = DatabaseManager()
        self.exporter = DataExporter()

    def generate_30_day_history(
        self,
        start_date: Optional[date] = date(2026, 9, 1),
        end_date: Optional[date] = None,
        days: int = 30,
        sources: Optional[List[str]] = None
    ) -> pd.DataFrame:
        if start_date is not None:
            if end_date is None:
                end_date = start_date + timedelta(days=days - 1)
        else:
            if end_date is None:
                end_date = date.today()
            start_date = end_date - timedelta(days=days - 1)

        if sources is None:
            sources = ["MakeMyTrip", "EaseMyTrip", "Cleartrip", "Ixigo", "Yatra", "IndiGo Direct"]

        print(f"Generating {days}-day historical airfare observations from {start_date} to {end_date} (Base Date: {start_date})...")

        all_observations: List[dict] = []
        routes = self.matrix_gen.routes
        horizons = self.matrix_gen.default_horizons

        current_date = start_date
        day_counter = 0

        while current_date <= end_date:
            obs_date_str = current_date.isoformat()
            now_iso = datetime.combine(current_date, datetime.min.time()).replace(tzinfo=timezone.utc).isoformat()

            # Daily tasks
            for route_info in routes:
                origin = route_info["origin"]
                dest = route_info["destination"]

                for h in horizons:
                    dep_date = current_date + timedelta(days=h)
                    task = SearchTask(
                        origin=origin,
                        destination=dest,
                        departure_date=dep_date.isoformat(),
                        advance_days=h,
                        observation_date=obs_date_str,
                        observation_timestamp=now_iso
                    )

                    for source in sources:
                        quotes = RealisticAirfareMockEngine.generate_flights_for_task(task, source)
                        for q in quotes:
                            all_observations.append(q.model_dump())

            day_counter += 1
            if day_counter % 5 == 0 or day_counter == days:
                print(f"  [Progress] Completed day {day_counter}/{days} ({obs_date_str}). Cumulative observations: {len(all_observations)}")

            current_date += timedelta(days=1)

        raw_df = pd.DataFrame(all_observations)
        print(f"Total raw simulated observations: {len(raw_df)}")

        # Clean raw observations
        print("Executing data cleaning pipeline on historical dataset...")
        clean_result = self.cleaner.clean_pipeline(raw_df)
        cleaned_df = clean_result["cleaned_df"]
        metrics = clean_result["metrics"]

        print(f"Cleaning complete: {metrics['final_clean_observations']} clean records retained.")
        print(f"Saving to SQLite database ({self.db.db_url})...")
        self.db.save_dataframe(cleaned_df)

        parquet_path = self.exporter.export_parquet(cleaned_df, prefix="backtest_30days")
        print(f"Saved 30-day historical dataset to Parquet: {parquet_path}")

        return cleaned_df
