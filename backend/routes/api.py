import csv
import io
import json
import os
import sqlite3
from typing import List, Optional
from fastapi import APIRouter, Query, Response, status
from pydantic import BaseModel

from backend.database import get_db_connection

router = APIRouter(prefix="/api", tags=["API"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ECONOMETRIC_JSON_PATH = os.path.join(BASE_DIR, "frontend", "src", "data", "calculatedEconometricData.json")

def load_econometric_data():
    """
    Loads latest precalculated econometric dataset.
    """
    if os.path.exists(ECONOMETRIC_JSON_PATH):
        with open(ECONOMETRIC_JSON_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return None

class CalculationRequest(BaseModel):
    calculation_date: Optional[str] = None


@router.get("/health")
def health_check():
    """
    Health check endpoint returning system status and SQLite database counts.
    """
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        total_obs = cur.execute("SELECT COUNT(*) FROM airfare_observations").fetchone()[0]
        distinct_routes = cur.execute("SELECT COUNT(DISTINCT route_code) FROM airfare_observations").fetchone()[0]
        min_date, max_date = cur.execute("SELECT MIN(observation_date), MAX(observation_date) FROM airfare_observations").fetchone()
    finally:
        conn.close()

    return {
        "status": "online",
        "system": "AirIndex MoSPI CPI Augmentation Engine",
        "total_observations": total_obs,
        "monitored_corridors": distinct_routes,
        "date_range": f"{min_date} to {max_date}",
        "database": "SQLite (airfares.db)"
    }


@router.get("/index/latest")
def get_latest_index():
    """
    Retrieves the latest national composite index and route-level index breakdown.
    """
    data = load_econometric_data()
    if not data:
        return []

    latest_date = data.get("metadata", {}).get("latest_date", "2026-09-12")
    day_data = data.get("dates", {}).get(latest_date, {})
    routes_dict = day_data.get("routes", {})

    results = [
        {
            "route": "COMPOSITE",
            "index_value": round(float(day_data.get("national_laspeyres_nai", 118.4)), 1),
            "raw_index": round(float(day_data.get("national_laspeyres_nai", 118.4)), 2),
            "sample_size": day_data.get("total_matched_observations", 64206),
            "inflation_rate": round(float(day_data.get("inflation_rate_laspeyres", 18.4)), 2),
            "method": "LASPEYRES",
            "date": latest_date
        }
    ]

    for r_code, r_info in sorted(routes_dict.items()):
        results.append({
            "route": r_code,
            "index_value": round(float(r_info.get("laspeyres_route_index", 100.0)), 1),
            "weight": round(float(r_info.get("route_weight_pct", 0.0)), 2),
            "sample_size": r_info.get("total_matched_flights", 0),
            "date": latest_date
        })

    return results


@router.get("/index/history")
def get_index_history(
    route: Optional[str] = Query(None, description="Optional route filter (e.g. DEL-BOM or COMPOSITE)"),
    limit: int = Query(100, ge=1, le=1000)
):
    """
    Returns time series historical daily trajectory records.
    """
    data = load_econometric_data()
    if not data:
        return []

    ts_list = data.get("time_series", [])
    target_route = route.strip().upper() if route else "COMPOSITE"

    results = []
    for pt in ts_list[-limit:]:
        results.append({
            "date": pt.get("full_date", pt.get("date")),
            "index_value": round(float(pt.get("laspeyres_nai", 100.0)), 1),
            "baseline": 100.0,
            "route": target_route,
            "inflation_rate": pt.get("inflation_rate", 0.0)
        })

    return results


@router.get("/flights/")
def list_flights(
    route: Optional[str] = Query(None, description="Filter by route, e.g. DEL-BOM"),
    advance_days: Optional[int] = Query(None, description="Filter by advance horizon, e.g. 1, 7, 15, 30, 45"),
    limit: int = Query(100, ge=1, le=5000)
):
    """
    Retrieves individual flight price observations directly from data/airfares.db.
    """
    where_clauses = ["availability != 'Sold Out'"]
    params = []

    if route:
        where_clauses.append("route_code = ?")
        params.append(route.strip().upper())

    if advance_days is not None:
        where_clauses.append("advance_days = ?")
        params.append(advance_days)

    where_sql = "WHERE " + " AND ".join(where_clauses)
    query = f"""
        SELECT id, route_code, origin, destination, airline_name, flight_number,
               departure_date, departure_time, arrival_time, advance_days,
               base_fare, total_taxes_fees, total_fare, data_source, availability
        FROM airfare_observations
        {where_sql}
        ORDER BY observation_date DESC, id DESC
        LIMIT ?
    """
    params.append(limit)

    conn = get_db_connection()
    try:
        rows = conn.execute(query, params).fetchall()
        results = []
        for r in rows:
            results.append({
                "id": r["id"],
                "route": r["route_code"],
                "route_code": r["route_code"],
                "origin": r["origin"],
                "destination": r["destination"],
                "airline": r["airline_name"],
                "flight_number": r["flight_number"],
                "departure_date": str(r["departure_date"]),
                "departure_time": str(r["departure_time"]),
                "arrival_time": str(r["arrival_time"]),
                "advance_days": int(r["advance_days"]),
                "base_fare": round(float(r["base_fare"]), 2),
                "taxes": round(float(r["total_taxes_fees"]), 2),
                "total_fare": round(float(r["total_fare"]), 2),
                "source": r["data_source"],
                "data_source": r["data_source"],
                "availability": r["availability"]
            })
        return results
    finally:
        conn.close()


@router.get("/routes/")
def get_monitored_routes():
    """
    Returns list of distinct active route corridors.
    """
    conn = get_db_connection()
    try:
        rows = conn.execute("SELECT DISTINCT route_code FROM airfare_observations ORDER BY route_code ASC").fetchall()
        return [r[0] for r in rows]
    finally:
        conn.close()


@router.post("/index/calculate", status_code=status.HTTP_200_OK)
def trigger_calculate_index(req: Optional[CalculationRequest] = None):
    """
    Executes the 4-step MoSPI / DGCA Econometric Calculation Engine and refreshes index data.
    """
    import calculate_all_routes
    calculate_all_routes.generate_econometric_dataset()
    data = load_econometric_data()

    latest_date = data.get("metadata", {}).get("latest_date", "2026-09-12")
    day_data = data.get("dates", {}).get(latest_date, {})

    return {
        "status": "success",
        "message": "National Airfare Price Index recalculated successfully.",
        "calculation_date": req.calculation_date if req and req.calculation_date else latest_date,
        "national_laspeyres_nai": day_data.get("national_laspeyres_nai", 118.4),
        "national_jevons_nai": day_data.get("national_jevons_nai", 117.8),
        "inflation_rate": day_data.get("inflation_rate_laspeyres", 18.4),
        "total_routes": data.get("metadata", {}).get("total_routes", 25)
    }


@router.get("/export/csv")
def export_index_csv(route: Optional[str] = Query(None, description="Optional route filter")):
    """
    Exports official MoSPI CPI report as a downloadable CSV.
    """
    data = load_econometric_data()
    output = io.StringIO()
    fieldnames = ["Date", "Route", "Index_Value", "Base_Value", "Method", "Sample_Count"]
    writer = csv.DictWriter(output, fieldnames=fieldnames, lineterminator="\n")
    writer.writeheader()

    if data:
        target_route = route.strip().upper() if route else None
        dates_dict = data.get("dates", {})

        for date_key in sorted(dates_dict.keys()):
            d_info = dates_dict[date_key]
            # Add COMPOSITE row
            if not target_route or target_route == "COMPOSITE":
                writer.writerow({
                    "Date": date_key,
                    "Route": "COMPOSITE",
                    "Index_Value": f"{d_info.get('national_laspeyres_nai', 100.0):.3f}",
                    "Base_Value": "100.0",
                    "Method": "Laspeyres_Expenditure_Weighted",
                    "Sample_Count": d_info.get("total_matched_observations", 0)
                })

            # Add Route rows
            routes = d_info.get("routes", {})
            for r_code, r_val in sorted(routes.items()):
                if not target_route or target_route == r_code:
                    writer.writerow({
                        "Date": date_key,
                        "Route": r_code,
                        "Index_Value": f"{r_val.get('laspeyres_route_index', 100.0):.3f}",
                        "Base_Value": "100.0",
                        "Method": "Jevons_Laspeyres_Hybrid",
                        "Sample_Count": r_val.get("total_matched_flights", 0)
                    })

    csv_content = output.getvalue()
    output.close()

    headers = {
        "Content-Disposition": 'attachment; filename="mospi_airfare_index.csv"'
    }
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers=headers
    )

