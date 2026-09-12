"""
Data Exporter Module.
Exports preprocessed observations to high-performance Parquet time-series files and CSV archives.
"""
import os
from datetime import datetime
from typing import Optional
import pandas as pd


class DataExporter:
    """Handles snapshot exports for downstream econometric models and dashboards."""

    def __init__(self, export_dir: Optional[str] = None):
        if export_dir is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            export_dir = os.path.join(base_dir, "data", "processed")
        self.export_dir = export_dir
        os.makedirs(self.export_dir, exist_ok=True)

    def export_parquet(self, df: pd.DataFrame, prefix: str = "cleaned_airfares") -> str:
        """Exports DataFrame to Apache Parquet format (fast columnar storage)."""
        if df.empty:
            raise ValueError("Cannot export empty DataFrame to Parquet.")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{prefix}_{timestamp}.parquet"
        filepath = os.path.join(self.export_dir, filename)
        df.to_parquet(filepath, index=False, engine="pyarrow", compression="snappy")
        return filepath

    def export_csv(self, df: pd.DataFrame, prefix: str = "cleaned_airfares") -> str:
        """Exports DataFrame to CSV for audit and manual inspections."""
        if df.empty:
            raise ValueError("Cannot export empty DataFrame to CSV.")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{prefix}_{timestamp}.csv"
        filepath = os.path.join(self.export_dir, filename)
        df.to_csv(filepath, index=False)
        return filepath

    def export_cpi_summary(self, df: pd.DataFrame) -> str:
        """
        Exports pre-aggregated route-horizon summary table with geometric mean fares,
        median base fares, and statutory tax ratios.
        """
        if df.empty:
            raise ValueError("Cannot summarize empty DataFrame.")

        # Filter out sold-out flights for active price calculations
        active = df[df["availability"] != "Sold Out"].copy()

        summary = active.groupby(["route_code", "advance_days"]).agg(
            observation_count=("total_fare", "count"),
            mean_total_fare=("total_fare", "mean"),
            median_total_fare=("total_fare", "median"),
            mean_base_fare=("base_fare", "mean"),
            mean_taxes_fees=("total_taxes_fees", "mean"),
            min_fare=("total_fare", "min"),
            max_fare=("total_fare", "max")
        ).reset_index()

        summary["tax_ratio_pct"] = round((summary["mean_taxes_fees"] / summary["mean_total_fare"]) * 100, 2)
        summary["mean_total_fare"] = summary["mean_total_fare"].round(2)
        summary["median_total_fare"] = summary["median_total_fare"].round(2)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filepath = os.path.join(self.export_dir, f"cpi_basket_summary_{timestamp}.csv")
        summary.to_csv(filepath, index=False)
        return filepath
