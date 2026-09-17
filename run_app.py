"""
AirIndex MoSPI — Unified Application Runner
============================================
Run either the integrated full-stack server or concurrent development servers.

Usage:
  python run_app.py          # Starts unified production server on http://127.0.0.1:8000
  python run_app.py --dev    # Starts backend (port 8000) & Vite frontend (port 5173)
"""

import sys
import os
import subprocess
import uvicorn

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def start_unified_server():
    print("=" * 70)
    print("  🚀 AIRINDEX MoSPI — UNIFIED PRODUCTION SERVER")
    print("  Platform: Ministry of Statistics & Programme Implementation (MoSPI)")
    print("  Backend:  FastAPI + SQLite (data/airfares.db - 64,206 records)")
    print("  Frontend: React 19 Single Page App (mounted from frontend/dist)")
    print("  URL:      http://127.0.0.1:8000")
    print("  API Docs: http://127.0.0.1:8000/docs")
    print("  Press Ctrl+C to stop.")
    print("=" * 70)
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=False)

def start_dev_servers():
    print("=" * 70)
    print("  ⚙️  AIRINDEX MoSPI — CONCURRENT DEV SERVERS")
    print("  Backend API:      http://127.0.0.1:8000/api")
    print("  Vite Dev Server:  http://localhost:5173")
    print("=" * 70)
    
    frontend_dir = os.path.join(BASE_DIR, "frontend")
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"

    # Start FastAPI backend process
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
        cwd=BASE_DIR
    )

    try:
        # Start Vite dev server in foreground
        subprocess.run([npm_cmd, "run", "dev"], cwd=frontend_dir)
    finally:
        backend_proc.terminate()

if __name__ == "__main__":
    if "--dev" in sys.argv:
        start_dev_servers()
    else:
        start_unified_server()

