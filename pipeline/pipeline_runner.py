"""
Master Pipeline Runner.
Orchestrates task generation, multi-source scraping, Pydantic validation,
audited data cleaning, database insertion, and Parquet time-series export.
"""
import asyncio
from datetime import date, datetime
from typing import List, Dict, Any, Optional
import pandas as pd

from pipeline.schema import SearchTask, AirfareObservation
from pipeline.matrix import RouteMatrixGenerator
from pipeline.cleaner import AirfareDataCleaner
from scrapers.makemytrip import MakeMyTripScraper
from scrapers.easemytrip import EaseMyTripScraper
from scrapers.cleartrip import CleartripScraper
from scrapers.ixigo import IxigoScraper
from scrapers.yatra import YatraScraper
from scrapers.indigo_direct import IndiGoDirectScraper
from storage.db import DatabaseManager
from storage.exporter import DataExporter


class AirfarePipelineRunner:
    """End-to-end ingestion and cleaning pipeline coordinator."""

    def __init__(
        self,
        use_mock_fallback: bool = True,
        live_mode: bool = True,
        disable_jitter: bool = False,
        db_url: Optional[str] = None
    ):
        self.matrix_gen = RouteMatrixGenerator()
        self.cleaner = AirfareDataCleaner()
        self.db = DatabaseManager(db_url=db_url)
        self.exporter = DataExporter()
        self.live_mode = live_mode

        # Initialize target scrapers (5 OTAs + 1 direct carrier benchmark)
        self.scrapers = [
            MakeMyTripScraper(enable_mock_fallback=use_mock_fallback),
            EaseMyTripScraper(enable_mock_fallback=use_mock_fallback),
            CleartripScraper(enable_mock_fallback=use_mock_fallback),
            IxigoScraper(enable_mock_fallback=use_mock_fallback),
            YatraScraper(enable_mock_fallback=use_mock_fallback),
            IndiGoDirectScraper(enable_mock_fallback=use_mock_fallback),
        ]

        for s in self.scrapers:
            s.live_mode = live_mode
            if disable_jitter:
                s.disable_jitter = True

    async def run_sweep(
        self,
        base_date: Optional[date] = None,
        horizons: Optional[List[int]] = None,
        route_filter: Optional[List[str]] = None,
        scraper_names: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Executes a complete scraping and cleaning sweep.
        """
        start_time = datetime.now()
        tasks = self.matrix_gen.generate_tasks(
            base_date=base_date,
            horizons=horizons,
            route_filter=route_filter
        )

        active_scrapers = self.scrapers
        if scraper_names:
            active_scrapers = [s for s in self.scrapers if s.name in scraper_names]

        mode_desc = "DYNAMIC LIVE SCRAPING" if self.live_mode else "MOCK SIMULATION"
        print(f"[{start_time.strftime('%H:%M:%S')}] Starting Airfare Sweep [{mode_desc}]: {len(tasks)} tasks across {len(active_scrapers)} platforms.")

        raw_observations: List[AirfareObservation] = []

        # Execute queries sequentially per scraper with ethical delay to avoid flood
        for scraper in active_scrapers:
            print(f"  -> Ingesting from: {scraper.name}...")
            for task in tasks:
                try:
                    quotes = await scraper.search(task)
                    raw_observations.extend(quotes)
                except Exception as e:
                    print(f"     [Error] {scraper.name} on {task.origin}-{task.destination}: {e}")

        print(f"[{datetime.now().strftime('%H:%M:%S')}] Ingested {len(raw_observations)} raw observations.")

        if not raw_observations:
            return {"status": "empty", "metrics": {}, "parquet_path": None}

        # Convert to DataFrame
        raw_df = pd.DataFrame([obs.model_dump() for obs in raw_observations])

        # Execute Cleaning Pipeline
        clean_result = self.cleaner.clean_pipeline(raw_df)
        clean_df = clean_result["cleaned_df"]
        metrics = clean_result["metrics"]

        print(f"[{datetime.now().strftime('%H:%M:%S')}] Cleaning complete:")
        print(f"     - Raw rows: {metrics['total_raw']}")
        print(f"     - Deduplicated: {metrics['dedup_dropped']}")
        print(f"     - Outliers eliminated: {metrics['outliers_dropped']}")
        print(f"     - Clean observations: {metrics['final_clean_observations']}")

        # Persist to Database
        rows_saved = self.db.save_dataframe(clean_df)

        # Export to Parquet and CSV summary
        parquet_path = self.exporter.export_parquet(clean_df)
        summary_path = self.exporter.export_cpi_summary(clean_df)

        elapsed_sec = (datetime.now() - start_time).total_seconds()
        metrics["elapsed_seconds"] = round(elapsed_sec, 2)
        metrics["db_rows_saved"] = rows_saved

        return {
            "status": "success",
            "metrics": metrics,
            "parquet_path": parquet_path,
            "summary_path": summary_path,
            "cleaned_count": len(clean_df)
        }
