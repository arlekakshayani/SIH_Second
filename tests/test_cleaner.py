"""
Unit tests for data cleaning, tax auditing, and outlier detection.
"""
import pandas as pd
import numpy as np
from pipeline.cleaner import AirfareDataCleaner


def test_deduplication():
    cleaner = AirfareDataCleaner()
    data = [
        {
            "observation_date": "2026-09-11",
            "departure_date": "2026-09-18",
            "origin": "DEL",
            "destination": "BOM",
            "flight_number": "6E-205",
            "data_source": "MakeMyTrip",
            "total_fare": 4500.0,
            "base_fare": 3700.0,
            "total_taxes_fees": 800.0
        },
        {
            "observation_date": "2026-09-11",
            "departure_date": "2026-09-18",
            "origin": "DEL",
            "destination": "BOM",
            "flight_number": "6E-205",
            "data_source": "MakeMyTrip",
            "total_fare": 4500.0,
            "base_fare": 3700.0,
            "total_taxes_fees": 800.0
        }
    ]
    df = pd.DataFrame(data)
    dedup = cleaner.deduplicate(df)
    assert len(dedup) == 1


def test_tax_decomposition_delhi():
    cleaner = AirfareDataCleaner()
    row = {
        "observation_date": "2026-09-11",
        "departure_date": "2026-09-18",
        "origin": "DEL",
        "destination": "BOM",
        "total_fare": 5000.0,
        "base_fare": 4000.0,
        "total_taxes_fees": 1000.0
    }
    df = pd.DataFrame([row])
    audited = cleaner.audit_and_decompose_taxes(df).iloc[0]

    # Base fare + taxes = total fare
    assert audited["base_fare"] + audited["total_taxes_fees"] == 5000.0
    # UDF for DEL is ₹180
    assert audited["user_development_fee_udf"] == 180.0
    # PSF is ₹91
    assert audited["passenger_service_fee_psf"] == 91.0
    # GST is 5% of base (₹200)
    assert audited["gst"] == 200.0


def test_mad_outlier_filtering():
    cleaner = AirfareDataCleaner()
    # Create normal distribution of 10 fares around ₹5000 + 1 crazy glitch fare of ₹120,000
    fares = [4800, 4900, 5000, 5100, 4950, 5050, 5200, 4850, 5150, 4980, 120000]
    data = []
    for f in fares:
        data.append({
            "origin": "DEL",
            "destination": "BOM",
            "advance_days": 7,
            "total_fare": float(f),
            "base_fare": float(f) - 800,
            "total_taxes_fees": 800.0,
            "availability": "Available"
        })
    df = pd.DataFrame(data)
    clean_df, outliers_df = cleaner.filter_statistical_outliers(df)

    # ₹120,000 should be detected and filtered out as an outlier
    assert len(clean_df) == 10
    assert len(outliers_df) == 1
    assert outliers_df.iloc[0]["total_fare"] == 120000.0
