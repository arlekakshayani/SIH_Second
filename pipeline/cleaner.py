"""
Data Cleaning, Tax Decomposition, and Statistical Outlier Detection Engine.
Preprocesses raw airfare observations into an audited, econometrically sound dataset for CPI index construction.
"""
import json
import os
from typing import Dict, Any, Tuple, Optional
import numpy as np
import pandas as pd


class AirfareDataCleaner:
    """
    Handles:
    1. Multi-key deduplication.
    2. Statutory tax reconciliation against AERA regulatory airport tariffs.
    3. Robust statistical outlier detection via Median Absolute Deviation (MAD) / Modified Z-score.
    4. Censoring and sold-out flight tracking.
    """

    def __init__(self, aera_config_path: Optional[str] = None):
        if aera_config_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            aera_config_path = os.path.join(base_dir, "config", "aera_tariffs.json")

        with open(aera_config_path, "r", encoding="utf-8") as f:
            self.aera_data = json.load(f)

        self.airport_tariffs = self.aera_data.get("airports", {})
        self.default_psf = self.aera_data.get("statutory_psf_inr", 91.0)
        self.gst_rate = self.aera_data.get("statutory_economy_gst_rate", 0.05)

    def deduplicate(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Removes duplicate fare quotes extracted within identical observation intervals.
        Composite key: observation_date, departure_date, route_code, flight_number, data_source.
        """
        if df.empty:
            return df

        subset_keys = [
            "observation_date",
            "departure_date",
            "origin",
            "destination",
            "flight_number",
            "data_source"
        ]
        # Only keep keys present in df
        present_keys = [k for k in subset_keys if k in df.columns]
        if not present_keys:
            return df

        initial_len = len(df)
        df_dedup = df.drop_duplicates(subset=present_keys, keep="last").copy()
        dedup_count = initial_len - len(df_dedup)
        if dedup_count > 0:
            df_dedup.attrs["dedup_dropped"] = dedup_count
        return df_dedup

    def audit_and_decompose_taxes(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Ensures exact mathematical consistency: Total Fare = Base Fare + Statutory Taxes + Surcharges.
        When an OTA bundles taxes into a single figure, decomposes it into:
        - User Development Fee (UDF): Point-of-origin AERA statutory tariff
        - Passenger Service Fee (PSF): Standard statutory fee
        - GST: 5% on economy base tariff
        - Fuel Surcharge (YQ): Balance carrier levy
        """
        if df.empty:
            return df

        df = df.copy()

        def reconcile_row(row):
            total = float(row.get("total_fare", 0.0))
            base = float(row.get("base_fare", 0.0))
            taxes = float(row.get("total_taxes_fees", 0.0))
            origin = str(row.get("origin", "")).upper()

            airport_meta = self.airport_tariffs.get(origin, {})
            origin_udf = airport_meta.get("udf_domestic_inr", 180.0)
            statutory_psf = airport_meta.get("psf_domestic_inr", self.default_psf)

            # Case A: Missing or zero base fare, but valid total
            if base <= 0 and total > (origin_udf + statutory_psf):
                estimated_tax = origin_udf + statutory_psf + (total * self.gst_rate)
                base = max(1000.0, total - estimated_tax)
                taxes = total - base

            # Case B: Discrepancy between base + taxes and total
            if abs((base + taxes) - total) > 1.0:
                taxes = max(0.0, round(total - base, 2))

            # Statutory breakdown decomposition
            gst_val = round(base * self.gst_rate, 2)
            fixed_statutory = origin_udf + statutory_psf + gst_val

            # Variable fuel surcharge (YQ) absorption
            if taxes >= fixed_statutory:
                fuel_yq = round(taxes - fixed_statutory, 2)
                udf_val = origin_udf
                psf_val = statutory_psf
            else:
                # Compressed tax regime fallback
                udf_val = min(origin_udf, round(taxes * 0.40, 2))
                psf_val = min(statutory_psf, round(taxes * 0.20, 2))
                gst_val = round(taxes * 0.15, 2)
                fuel_yq = max(0.0, round(taxes - (udf_val + psf_val + gst_val), 2))

            row["base_fare"] = round(base, 2)
            row["total_taxes_fees"] = round(taxes, 2)
            row["user_development_fee_udf"] = round(udf_val, 2)
            row["passenger_service_fee_psf"] = round(psf_val, 2)
            row["gst"] = round(gst_val, 2)
            row["fuel_surcharge_yq"] = round(fuel_yq, 2)
            row["total_fare"] = round(base + taxes, 2)

            return row

        return df.apply(reconcile_row, axis=1)

    def filter_statistical_outliers(
        self,
        df: pd.DataFrame,
        min_fare_threshold: float = 1500.0,
        max_fare_threshold: float = 65000.0,
        mad_threshold: float = 3.5
    ) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Applies Median Absolute Deviation (MAD) modified Z-score per route and advance horizon.
        Airfare distributions are asymmetric and heavy-tailed, making traditional Z-scores ineffective.
        
        Returns:
            (cleaned_df, outliers_df)
        """
        if df.empty:
            return df, pd.DataFrame()

        clean_chunks = []
        outlier_chunks = []

        group_cols = ["origin", "destination", "advance_days"]
        for (origin, dest, horizon), group in df.groupby(group_cols):
            # 1. Absolute domain boundary filter
            valid_domain = (group["total_fare"] >= min_fare_threshold) & (group["total_fare"] <= max_fare_threshold)
            domain_outliers = group[~valid_domain]
            if not domain_outliers.empty:
                outlier_chunks.append(domain_outliers)

            domain_valid_group = group[valid_domain]

            # 2. Statistical MAD filter on remaining items
            if len(domain_valid_group) < 4:
                # Group too small for robust dispersion estimation
                clean_chunks.append(domain_valid_group)
                continue

            median = domain_valid_group["total_fare"].median()
            abs_dev = np.abs(domain_valid_group["total_fare"] - median)
            mad = np.median(abs_dev)

            if mad == 0 or np.isnan(mad):
                clean_chunks.append(domain_valid_group)
                continue

            # Modified Z-score: 0.6745 * (x - median) / MAD
            modified_z = 0.6745 * (domain_valid_group["total_fare"] - median) / mad
            stat_valid = modified_z.abs() <= mad_threshold

            clean_chunks.append(domain_valid_group[stat_valid])
            stat_outliers = domain_valid_group[~stat_valid]
            if not stat_outliers.empty:
                outlier_chunks.append(stat_outliers)

        cleaned_df = pd.concat(clean_chunks, ignore_index=True) if clean_chunks else pd.DataFrame(columns=df.columns)
        outliers_df = pd.concat(outlier_chunks, ignore_index=True) if outlier_chunks else pd.DataFrame(columns=df.columns)

        return cleaned_df, outliers_df

    def process_sold_out_flights(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Standardizes availability tagging.
        Sold-out flights are retained for capacity monitoring and lead-time demand analysis,
        while preventing price imputation bias in elementary price index computation.
        """
        if df.empty:
            return df

        df = df.copy()
        if "availability" in df.columns:
            df["availability"] = df["availability"].fillna("Available")
            df["is_sold_out"] = df["availability"] == "Sold Out"
        else:
            df["availability"] = "Available"
            df["is_sold_out"] = False

        return df

    def clean_pipeline(self, raw_df: pd.DataFrame) -> Dict[str, Any]:
        """
        Executes the entire end-to-end cleaning protocol and produces an audit report.
        """
        if raw_df.empty:
            return {
                "cleaned_df": raw_df,
                "outliers_df": pd.DataFrame(),
                "metrics": {"total_raw": 0, "deduped": 0, "outliers": 0, "final_clean": 0}
            }

        total_raw = len(raw_df)

        # Stage 1: Deduplication
        dedup_df = self.deduplicate(raw_df)
        dedup_dropped = total_raw - len(dedup_df)

        # Stage 2: Tax decomposition & reconciliation
        audited_df = self.audit_and_decompose_taxes(dedup_df)

        # Stage 3: Sold-out tagging
        availability_df = self.process_sold_out_flights(audited_df)

        # Stage 4: Outlier detection
        cleaned_df, outliers_df = self.filter_statistical_outliers(availability_df)

        metrics = {
            "total_raw": total_raw,
            "dedup_dropped": dedup_dropped,
            "retained_after_dedup": len(dedup_df),
            "outliers_dropped": len(outliers_df),
            "final_clean_observations": len(cleaned_df),
            "outlier_rate_pct": round((len(outliers_df) / max(1, len(dedup_df))) * 100, 2)
        }

        return {
            "cleaned_df": cleaned_df,
            "outliers_df": outliers_df,
            "metrics": metrics
        }
