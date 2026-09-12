"""
Jevons and Laspeyres Econometric Index Calculator.
Computes elementary price relatives and national weighted APIx for CPI augmentation.
"""
import math
import os
import json
from typing import Dict, Any, Optional
import numpy as np
import pandas as pd


class AirfareIndexCalculator:
    """Calculates official CPI-compliant Real-Time Airfare Price Indices."""

    def __init__(self, weights_config_path: Optional[str] = None):
        if weights_config_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            weights_config_path = os.path.join(base_dir, "config", "weights.json")

        with open(weights_config_path, "r", encoding="utf-8") as f:
            weights_data = json.load(f)

        self.route_weights = weights_data["route_weights"]
        self.horizon_weights = {
            1: weights_data["horizon_weights"]["T1"]["weight"],
            7: weights_data["horizon_weights"]["T7"]["weight"],
            15: weights_data["horizon_weights"]["T15"]["weight"],
            30: weights_data["horizon_weights"]["T30"]["weight"],
            45: weights_data["horizon_weights"]["T45"]["weight"],
        }

    DEFAULT_BASE_DATE = "2026-09-01"

    def compute_elementary_jevons(self, df: pd.DataFrame, base_date: Optional[str] = "2026-09-01") -> pd.DataFrame:
        """
        Calculates the elementary Jevons price relative for each route and horizon.
        Uses geometric mean of prices relative to base period:
        Jevons = (prod(P_t) / prod(P_0))^(1/n)
        Anchored on fixed base date (default: 2026-09-01).
        """
        if df.empty:
            return pd.DataFrame()

        # Exclude sold-out flights from active price relatives
        active = df[df["availability"] != "Sold Out"].copy()

        # Compute geometric mean per (observation_date, route_code, advance_days)
        def geometric_mean(series):
            clean = series[series > 0]
            if len(clean) == 0:
                return np.nan
            return float(np.exp(np.log(clean).mean()))

        grouped = active.groupby(["observation_date", "route_code", "advance_days"])["total_fare"].apply(geometric_mean).reset_index()
        grouped.rename(columns={"total_fare": "geometric_mean_fare"}, inplace=True)

        if base_date is None:
            base_date = self.DEFAULT_BASE_DATE

        # Validate that base_date exists in observations, fallback gracefully with notice
        avail_dates = grouped["observation_date"].unique()
        if base_date not in avail_dates:
            fallback_date = str(grouped["observation_date"].min())
            print(f"[Notice] Fixed base date '{base_date}' not found in current dataset. Using available earliest date '{fallback_date}'.")
            base_date = fallback_date

        # Extract base period geometric means
        base_df = grouped[grouped["observation_date"] == base_date][["route_code", "advance_days", "geometric_mean_fare"]]
        base_df.rename(columns={"geometric_mean_fare": "base_geom_fare"}, inplace=True)

        merged = pd.merge(grouped, base_df, on=["route_code", "advance_days"], how="left")
        merged["jevons_relative"] = (merged["geometric_mean_fare"] / merged["base_geom_fare"]).round(4)
        merged["elementary_index"] = (merged["jevons_relative"] * 100.0).round(2)

        return merged

    def compute_daily_apix(self, df: pd.DataFrame, base_date: Optional[str] = "2026-09-01") -> pd.DataFrame:
        """
        Aggregates elementary indices across horizons (Wh) and routes (Wr)
        to yield the daily National Airfare Price Index (APIx_t) with Base = 100.
        Anchors calculations to the fixed base date (default: 2026-09-01).
        """
        if base_date is None:
            base_date = self.DEFAULT_BASE_DATE

        elem_df = self.compute_elementary_jevons(df, base_date=base_date)
        if elem_df.empty:
            return pd.DataFrame()

        # Step 1: Horizon aggregation: I_r,t = sum(Wh * I_r,h,t)
        elem_df["h_weight"] = elem_df["advance_days"].map(self.horizon_weights).fillna(0.20)
        elem_df["weighted_elem"] = elem_df["elementary_index"] * elem_df["h_weight"]

        route_daily = elem_df.groupby(["observation_date", "route_code"]).agg(
            route_index=("weighted_elem", "sum"),
            weight_sum=("h_weight", "sum")
        ).reset_index()
        route_daily["route_index"] = (route_daily["route_index"] / route_daily["weight_sum"]).round(2)

        # Step 2: National aggregation: APIx_t = sum(Wr * I_r,t)
        route_daily["r_weight"] = route_daily["route_code"].map(self.route_weights).fillna(0.04)
        route_daily["weighted_route_index"] = route_daily["route_index"] * route_daily["r_weight"]

        national_daily = route_daily.groupby("observation_date").agg(
            apix=("weighted_route_index", "sum"),
            total_route_weight=("r_weight", "sum")
        ).reset_index()
        national_daily["apix"] = (national_daily["apix"] / national_daily["total_route_weight"]).round(2)
        national_daily["inflation_rate_pct"] = ((national_daily["apix"] - 100.0)).round(2)

        return national_daily

    def compute_lead_time_elasticity(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculates average fare escalation curve across advance horizons (T+45 down to T+1).
        """
        active = df[df["availability"] != "Sold Out"]
        elasticity = active.groupby("advance_days").agg(
            average_total_fare=("total_fare", "mean"),
            average_base_fare=("base_fare", "mean"),
            average_taxes=("total_taxes_fees", "mean"),
            flight_count=("total_fare", "count")
        ).reset_index()

        baseline_fare = elasticity.loc[elasticity["advance_days"] == 45, "average_total_fare"]
        if not baseline_fare.empty:
            base_val = baseline_fare.values[0]
            elasticity["surge_multiplier"] = (elasticity["average_total_fare"] / base_val).round(2)
        else:
            elasticity["surge_multiplier"] = 1.0

        return elasticity.round(2)
