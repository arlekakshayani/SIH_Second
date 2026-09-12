"""
Unit tests for Jevons elementary index and Laspeyres aggregation.
"""
import pandas as pd
from index.jevons import AirfareIndexCalculator


def test_jevons_elementary_computation():
    calc = AirfareIndexCalculator()

    # Day 0: Two flights at ₹4000 and ₹6000 -> geom mean = sqrt(24000000) ~= 4898.98
    # Day 1: Same flights at ₹4400 and ₹6600 -> geom mean = 1.10 * Day 0 geom mean -> Jevons = 1.10
    data = [
        # Day 0
        {"observation_date": "2026-09-01", "route_code": "DEL-BOM", "advance_days": 7, "total_fare": 4000.0, "availability": "Available"},
        {"observation_date": "2026-09-01", "route_code": "DEL-BOM", "advance_days": 7, "total_fare": 6000.0, "availability": "Available"},
        # Day 1 (10% increase)
        {"observation_date": "2026-09-02", "route_code": "DEL-BOM", "advance_days": 7, "total_fare": 4400.0, "availability": "Available"},
        {"observation_date": "2026-09-02", "route_code": "DEL-BOM", "advance_days": 7, "total_fare": 6600.0, "availability": "Available"},
    ]
    df = pd.DataFrame(data)
    elem_df = calc.compute_elementary_jevons(df, base_date="2026-09-01")

    day0 = elem_df[elem_df["observation_date"] == "2026-09-01"].iloc[0]
    day1 = elem_df[elem_df["observation_date"] == "2026-09-02"].iloc[0]

    assert day0["elementary_index"] == 100.0
    assert abs(day1["elementary_index"] - 110.0) < 0.1


def test_daily_apix_fixed_base_date():
    calc = AirfareIndexCalculator()
    data = [
        {"observation_date": "2026-09-01", "route_code": "DEL-BOM", "advance_days": 7, "total_fare": 5000.0, "availability": "Available"},
        {"observation_date": "2026-09-02", "route_code": "DEL-BOM", "advance_days": 7, "total_fare": 5500.0, "availability": "Available"},
    ]
    df = pd.DataFrame(data)
    apix_df = calc.compute_daily_apix(df)  # Uses default base_date="2026-09-01"

    assert not apix_df.empty
    day0 = apix_df[apix_df["observation_date"] == "2026-09-01"].iloc[0]
    assert day0["apix"] == 100.0
    day1 = apix_df[apix_df["observation_date"] == "2026-09-02"].iloc[0]
    assert abs(day1["apix"] - 110.0) < 0.2
