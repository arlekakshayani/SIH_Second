"""
Unified Command-Line Interface (CLI) for the Real-time Airfare Price Index Backend.
Provides commands for running sweeps, 30-day historical backtesting, database inspection, and index generation.
"""
import argparse
import asyncio
import sys
from datetime import date
import pandas as pd

from pipeline.pipeline_runner import AirfarePipelineRunner
from backtest.generator import HistoricalDataGenerator
from storage.db import DatabaseManager
from storage.exporter import DataExporter
from index.jevons import AirfareIndexCalculator


def handle_sweep(args):
    """Executes an airfare scraping and cleaning sweep."""
    # Dynamic live web scraping is active by default; use --mock for offline simulation
    is_live = not getattr(args, "mock", False)
    runner = AirfarePipelineRunner(
        use_mock_fallback=True,
        live_mode=is_live,
        disable_jitter=args.fast
    )

    route_filter = None
    horizons = None

    if args.sample:
        # Sample mode: 2 high traffic routes, 3 horizons for instant demo
        route_filter = ["DEL-BOM", "BOM-DEL"]
        horizons = [1, 7, 15]
        print("[Sample Mode Active]: Scraping 2 routes (DEL-BOM, BOM-DEL) across 3 horizons (T+1, T+7, T+15)")

    result = asyncio.run(runner.run_sweep(
        route_filter=route_filter,
        horizons=horizons
    ))

    print("\n=======================================================")
    print(" SWEEP EXECUTION SUMMARY")
    print("=======================================================")
    metrics = result["metrics"]
    for k, v in metrics.items():
        print(f"  {k:30}: {v}")
    print(f"  Parquet Output                : {result['parquet_path']}")
    print(f"  Summary Basket Output         : {result['summary_path']}")
    print("=======================================================\n")


def handle_backtest(args):
    """Generates historical observations starting from fixed base date (Sep 1) for DGCA validation."""
    gen = HistoricalDataGenerator()
    days = args.days or 30
    start_date_str = getattr(args, "start_date", "2026-09-01")
    start_date = date.fromisoformat(start_date_str) if start_date_str else date(2026, 9, 1)
    df = gen.generate_30_day_history(start_date=start_date, days=days)
    print(f"\nSuccessfully generated and cleaned {len(df)} historical observations over {days} days (Base: {start_date_str}).")

    # Calculate index anchored on fixed base date
    calc = AirfareIndexCalculator()
    apix = calc.compute_daily_apix(df, base_date=start_date_str)
    print(f"\n--- Sample Daily APIx Trajectory (Base Date: {start_date_str} = 100.0) ---")
    print(apix.tail(10).to_string(index=False))

    elasticity = calc.compute_lead_time_elasticity(df)
    print("\n--- Advance Booking Lead-Time Elasticity Curve ---")
    print(elasticity.to_string(index=False))


def handle_index(args):
    """Calculates Jevons price relatives and national APIx from the database anchored to fixed base date."""
    db = DatabaseManager()
    df = db.query_observations(limit=50000)
    if df.empty:
        print("Database is empty. Run 'python cli.py sweep' or 'python cli.py backtest' first.")
        return

    base_date = getattr(args, "base_date", "2026-09-01")
    print(f"Loaded {len(df)} observations from database. Computing Jevons & Laspeyres indices (Fixed Base Date = {base_date})...")
    calc = AirfareIndexCalculator()

    apix = calc.compute_daily_apix(df, base_date=base_date)
    print("\n=======================================================")
    print(f" DAILY NATIONAL AIRFARE PRICE INDEX (APIx) - BASE DATE = {base_date} (P0 = 100.0)")
    print("=======================================================")
    print(apix.to_string(index=False))

    elasticity = calc.compute_lead_time_elasticity(df)
    print("\n=======================================================")
    print(" ADVANCE BOOKING (LEAD-TIME) ELASTICITY PROFILE")
    print("=======================================================")
    print(elasticity.to_string(index=False))


def handle_inspect(args):
    """Inspects database row counts, routes, and sample records."""
    db = DatabaseManager()
    stats = db.get_stats()
    print("\n=======================================================")
    print(" DATABASE INSPECTION STATS")
    print("=======================================================")
    for k, v in stats.items():
        print(f"  {k:25}: {v}")

    df = db.query_observations(limit=5)
    if not df.empty:
        print("\n--- Recent 5 Observations ---")
        display_cols = ["observation_date", "departure_date", "route_code", "flight_number", "base_fare", "total_taxes_fees", "total_fare", "data_source"]
        present = [c for c in display_cols if c in df.columns]
        print(df[present].to_string(index=False))
    print("=======================================================\n")


def main():
    parser = argparse.ArgumentParser(description="Real-time Airfare Price Index (APIx) Backend CLI")
    subparsers = parser.add_subparsers(dest="command", help="Available subcommands")

    # Sweep command - default is dynamic live scraping
    sweep_parser = subparsers.add_parser("sweep", help="Run automated dynamic scraping & cleaning sweep")
    sweep_parser.add_argument("--sample", action="store_true", help="Run quick sample on 2 routes (DEL-BOM, BOM-DEL)")
    sweep_parser.add_argument("--fast", action="store_true", help="Run in high-speed mode without rate-limiting jitter for fast demo")
    sweep_parser.add_argument("--live", action="store_true", default=True, help="Run dynamic live web scraping (Enabled by default)")
    sweep_parser.add_argument("--mock", action="store_true", help="Run offline simulation instead of default dynamic live scraping")

    # Backtest command - anchors to fixed Sep 1 base date by default
    bt_parser = subparsers.add_parser("backtest", help="Generate historical dataset starting from base date (default: Sep 1)")
    bt_parser.add_argument("--start-date", type=str, default="2026-09-01", help="Start/Base date (default: 2026-09-01)")
    bt_parser.add_argument("--days", type=int, default=30, help="Number of historical days to simulate (default: 30)")

    # Index command - defaults to fixed Sep 1 base date
    index_parser = subparsers.add_parser("index", help="Compute Jevons elementary index and national APIx")
    index_parser.add_argument("--base-date", type=str, default="2026-09-01", help="Fixed base date for index anchor P0 = 100 (default: 2026-09-01)")

    # Inspect command
    subparsers.add_parser("inspect", help="Inspect local database statistics and sample rows")

    args = parser.parse_args()

    if args.command == "sweep":
        handle_sweep(args)
    elif args.command == "backtest":
        handle_backtest(args)
    elif args.command == "index":
        handle_index(args)
    elif args.command == "inspect":
        handle_inspect(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
