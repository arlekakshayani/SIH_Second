"""
Scheduler Daemon for Automated Airfare Ingestion.
Runs scheduled sweeps twice daily (08:00 IST and 20:00 IST)
to capture morning business and evening corporate fare shifts.
"""
import asyncio
import sys
from datetime import datetime
from pipeline.pipeline_runner import AirfarePipelineRunner

try:
    from apscheduler.schedulers.blocking import BlockingScheduler
    from apscheduler.triggers.cron import CronTrigger
    HAS_APSCHEDULER = True
except ImportError:
    HAS_APSCHEDULER = False


def execute_scheduled_sweep():
    """Triggered by cron job at 08:00 and 20:00 IST."""
    print(f"\n=======================================================")
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] STARTING SCHEDULED AIRFARE SWEEP")
    print(f"=======================================================")
    runner = AirfarePipelineRunner(live_mode=True)
    result = asyncio.run(runner.run_sweep())
    print(f"Sweep Completed: {result['cleaned_count']} clean observations saved.")
    print(f"Parquet Snapshot: {result['parquet_path']}")


def start_scheduler():
    if not HAS_APSCHEDULER:
        print("[Notice] apscheduler package not installed. Running immediate sweep demonstration...")
        execute_scheduled_sweep()
        return

    scheduler = BlockingScheduler(timezone="Asia/Kolkata")

    # Schedule runs at 08:00 and 20:00 IST
    scheduler.add_job(
        execute_scheduled_sweep,
        CronTrigger(hour="8,20", minute=0, timezone="Asia/Kolkata"),
        id="airfare_daily_sweep",
        name="Twice Daily Airfare Ingestion (08:00 & 20:00 IST)",
        replace_existing=True
    )

    print("Airfare Ingestion Scheduler Initialized.")
    print("Scheduled triggers: 08:00 IST and 20:00 IST daily.")
    print("Press Ctrl+C to stop.")

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        print("Scheduler gracefully stopped.")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--now":
        execute_scheduled_sweep()
    else:
        start_scheduler()
