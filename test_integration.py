"""
Automated Integration Verification Suite (Pure Standard Library HTTP Test)
Tests all FastAPI endpoints against data/airfares.db and calculated econometric dataset.
"""

import sys
import os
import time
import threading
import urllib.request
import json
import uvicorn

# Ensure root directory is on PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.main import app

def run_tests():
    print("Testing AirIndex MoSPI Backend Endpoints via live HTTP...\n")

    # Start server in daemon thread
    server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=8000, log_level="warning"))
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    time.sleep(1.5)

    base_url = "http://127.0.0.1:8000"

    try:
        # 1. Health check
        with urllib.request.urlopen(f"{base_url}/api/health") as resp:
            assert resp.status == 200
            health = json.loads(resp.read().decode("utf-8"))
            print(f"[PASS] /api/health -> status={health['status']}, observations={health['total_observations']}, corridors={health['monitored_corridors']}")
            assert health["total_observations"] == 64206

        # 2. Latest Index
        with urllib.request.urlopen(f"{base_url}/api/index/latest") as resp:
            assert resp.status == 200
            latest = json.loads(resp.read().decode("utf-8"))
            assert len(latest) >= 26
            comp = latest[0]
            print(f"[PASS] /api/index/latest -> Composite Index: {comp['index_value']} (Inflation: {comp.get('inflation_rate')}%, Date: {comp['date']})")
            assert comp["route"] == "COMPOSITE"

        # 3. Index History
        with urllib.request.urlopen(f"{base_url}/api/index/history?limit=30") as resp:
            assert resp.status == 200
            history = json.loads(resp.read().decode("utf-8"))
            print(f"[PASS] /api/index/history -> Returned {len(history)} daily trajectory points (first: {history[0]['date']}, last: {history[-1]['date']})")
            assert len(history) > 0

        # 4. Flights endpoint
        with urllib.request.urlopen(f"{base_url}/api/flights/?limit=10") as resp:
            assert resp.status == 200
            flights = json.loads(resp.read().decode("utf-8"))
            print(f"[PASS] /api/flights/ -> Fetched {len(flights)} flight records from SQLite. Sample flight: {flights[0]['flight_number']} ({flights[0]['airline']}) on {flights[0]['route']} - Total: INR {flights[0]['total_fare']}")
            assert len(flights) == 10
            assert "base_fare" in flights[0] and "taxes" in flights[0] and "total_fare" in flights[0]

        # 5. Filtered flights by corridor
        with urllib.request.urlopen(f"{base_url}/api/flights/?route=DEL-BOM&limit=5") as resp:
            assert resp.status == 200
            del_bom_flights = json.loads(resp.read().decode("utf-8"))
            print(f"[PASS] /api/flights/?route=DEL-BOM -> Fetched {len(del_bom_flights)} flights on DEL-BOM corridor.")
            assert all(f["route"] == "DEL-BOM" for f in del_bom_flights)

        # 6. Routes list
        with urllib.request.urlopen(f"{base_url}/api/routes/") as resp:
            assert resp.status == 200
            routes = json.loads(resp.read().decode("utf-8"))
            print(f"[PASS] /api/routes/ -> Returned {len(routes)} monitored sectors: {routes[:5]}...")
            assert len(routes) == 25

        # 7. CSV Export
        with urllib.request.urlopen(f"{base_url}/api/export/csv") as resp:
            assert resp.status == 200
            csv_text = resp.read().decode("utf-8")
            lines = csv_text.strip().split("\n")
            print(f"[PASS] /api/export/csv -> Generated MoSPI CSV report with {len(lines)} rows. Header: {lines[0]}")
            assert "Date,Route,Index_Value,Base_Value,Method,Sample_Count" in lines[0]

        # 8. Single-Page Application (SPA) Serving
        with urllib.request.urlopen(f"{base_url}/") as resp:
            assert resp.status == 200
            html_text = resp.read().decode("utf-8")
            assert "<html" in html_text.lower()
            print("[PASS] GET / -> Successfully serves React SPA index.html")

        print("\nALL 8 INTEGRATION TESTS PASSED SUCCESSFULLY WITHOUT ERRORS!")

    finally:
        server.should_exit = True

if __name__ == "__main__":
    run_tests()
