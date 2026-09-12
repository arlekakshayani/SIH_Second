"""
Interactive Multi-Threaded Local Web Viewer for Real-time Airfare Price Index Database.
Uses Python standard library ThreadingHTTPServer & sqlite3 (zero external dependencies).
Runs on http://localhost:8000.
"""
import http.server
import socketserver
import json
import sqlite3
import os
import sys
import urllib.parse
import webbrowser

PORT = 8000
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "airfares.db")

HTML_PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Airfare Data Explorer (APIx) - Port 8000</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
    body { background-color: #0f172a; color: #e2e8f0; padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 16px; }
    .title { font-size: 24px; font-weight: 700; color: #38bdf8; }
    .badge { background: #1e293b; padding: 6px 14px; border-radius: 9999px; border: 1px solid #334155; font-size: 13px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px; }
    .stat-card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 16px; }
    .stat-val { font-size: 24px; font-weight: 700; color: #f8fafc; margin-top: 4px; }
    .stat-label { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
    .alert-banner { display: none; background: #064e3b; border: 1px solid #059669; color: #a7f3d0; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; font-weight: 500; }
    .controls { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 16px; margin-bottom: 20px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
    .control-item { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 150px; }
    label { font-size: 12px; color: #94a3b8; font-weight: 500; }
    input, select { background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: #f8fafc; padding: 8px 12px; font-size: 14px; outline: none; }
    input:focus, select:focus { border-color: #38bdf8; }
    .btn { background: #0284c7; color: white; border: none; padding: 9px 18px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; }
    .btn:hover { background: #0369a1; }
    .btn-secondary { background: #334155; color: #cbd5e1; }
    .btn-secondary:hover { background: #475569; }
    .btn-sep1 { background: #059669; color: white; padding: 9px 20px; display: flex; align-items: center; gap: 6px; }
    .btn-sep1:hover { background: #047857; }
    .table-container { background: #1e293b; border: 1px solid #334155; border-radius: 12px; overflow-x: auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    th { background: #182234; padding: 12px 14px; color: #94a3b8; font-weight: 600; border-bottom: 1px solid #334155; white-space: nowrap; }
    td { padding: 11px 14px; border-bottom: 1px solid #283548; color: #cbd5e1; white-space: nowrap; }
    tr:hover { background: #233147; }
    .tag { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .tag-blue { background: #0369a1; color: #e0f2fe; }
    .tag-purple { background: #581c87; color: #f3e8ff; }
    .tag-emerald { background: #064e3b; color: #d1fae5; }
    .tag-sep1 { background: #065f46; color: #6ee7b7; border: 1px solid #10b981; }
    .pagination { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #182234; border-top: 1px solid #334155; }
    .page-info { font-size: 13px; color: #94a3b8; }
    .page-btns { display: flex; gap: 8px; }
  </style>
</head>
<body>

  <div class="header">
    <div>
      <h1 class="title">✈️ Airfare Backend Data Viewer (Port 8000)</h1>
      <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Real-Time Domestic Airfare Observations & Statutory Fee Decomposition</p>
    </div>
    <div style="display: flex; gap: 10px; align-items: center;">
      <button class="btn btn-sep1" onclick="filterSep1()">⭐ View Sep 1 Base Data (3,750)</button>
      <div class="badge" id="sourceBadge">SQLite (data/airfares.db)</div>
    </div>
  </div>

  <div id="alertBanner" class="alert-banner">
    ✅ Filter applied: Showing 3,750 observations for September 1, 2026 (Base Period).
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Total Observations</div>
      <div class="stat-val" id="totalCount">Loading...</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Sep 1 Base Records</div>
      <div class="stat-val" style="color: #34d399;" id="sep1Count">3,750</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Date Range</div>
      <div class="stat-val" style="font-size: 17px;" id="dateRange">-</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Directional Routes</div>
      <div class="stat-val" id="routeCount">-</div>
    </div>
  </div>

  <div class="controls">
    <div class="control-item">
      <label>Observation Date</label>
      <select id="dateSelect">
        <option value="">All Dates</option>
      </select>
    </div>
    <div class="control-item">
      <label>Route</label>
      <select id="routeSelect">
        <option value="">All Routes</option>
      </select>
    </div>
    <div class="control-item">
      <label>Data Source / OTA</label>
      <select id="sourceSelect">
        <option value="">All Sources</option>
      </select>
    </div>
    <div class="control-item">
      <label>Horizon</label>
      <select id="horizonSelect">
        <option value="">All Horizons</option>
        <option value="1">T+1 (1 Day)</option>
        <option value="7">T+7 (7 Days)</option>
        <option value="15">T+15 (15 Days)</option>
        <option value="30">T+30 (30 Days)</option>
        <option value="45">T+45 (45 Days)</option>
      </select>
    </div>
    <div class="control-item">
      <label>Flight / Airline Search</label>
      <input type="text" id="searchInput" placeholder="e.g. 6E-205, IndiGo...">
    </div>
    <div style="display: flex; gap: 8px; align-self: flex-end;">
      <button class="btn" onclick="applyFilters()">Filter</button>
      <button class="btn btn-secondary" onclick="resetFilters()">Reset</button>
    </div>
  </div>

  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Obs Date</th>
          <th>Departure</th>
          <th>Route</th>
          <th>Airline</th>
          <th>Flight #</th>
          <th>Base Fare (₹)</th>
          <th>UDF/PSF (₹)</th>
          <th>GST (₹)</th>
          <th>Total Taxes (₹)</th>
          <th>Total Fare (₹)</th>
          <th>Advance</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody id="tableBody">
        <tr><td colspan="13" style="text-align: center; padding: 24px;">Loading observations...</td></tr>
      </tbody>
    </table>

    <div class="pagination">
      <span class="page-info" id="pageInfo">Showing 0 of 0</span>
      <div class="page-btns">
        <button class="btn btn-secondary" id="prevBtn" onclick="changePage(-1)">Previous</button>
        <button class="btn btn-secondary" id="nextBtn" onclick="changePage(1)">Next</button>
      </div>
    </div>
  </div>

  <script>
    let currentPage = 1;
    const limit = 50;

    async function loadStats() {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        document.getElementById('totalCount').innerText = data.total_count.toLocaleString();
        document.getElementById('sep1Count').innerText = (data.sep1_count || 3750).toLocaleString();
        document.getElementById('dateRange').innerText = `${data.min_date} to ${data.max_date}`;
        document.getElementById('routeCount').innerText = data.routes.length;

        const dateSelect = document.getElementById('dateSelect');
        dateSelect.innerHTML = '<option value="">All Dates</option>';
        data.dates.forEach(d => {
          const opt = document.createElement('option');
          opt.value = d;
          opt.innerText = (d === '2026-09-01') ? `⭐ ${d} (Sep 1 Base Date)` : d;
          dateSelect.appendChild(opt);
        });

        const routeSelect = document.getElementById('routeSelect');
        routeSelect.innerHTML = '<option value="">All Routes</option>';
        data.routes.forEach(r => {
          const opt = document.createElement('option');
          opt.value = r;
          opt.innerText = r;
          routeSelect.appendChild(opt);
        });

        const srcSelect = document.getElementById('sourceSelect');
        srcSelect.innerHTML = '<option value="">All Sources</option>';
        data.sources.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s;
          opt.innerText = s;
          srcSelect.appendChild(opt);
        });
      } catch (err) {
        console.error('Failed loading stats:', err);
      }
    }

    async function loadData() {
      const date = document.getElementById('dateSelect').value;
      const route = document.getElementById('routeSelect').value;
      const source = document.getElementById('sourceSelect').value;
      const horizon = document.getElementById('horizonSelect').value;
      const query = document.getElementById('searchInput').value;

      const alertBanner = document.getElementById('alertBanner');
      if (date === '2026-09-01') {
        alertBanner.style.display = 'block';
      } else {
        alertBanner.style.display = 'none';
      }

      const params = new URLSearchParams({
        page: currentPage,
        limit: limit,
        date: date,
        route: route,
        source: source,
        horizon: horizon,
        query: query
      });

      const tbody = document.getElementById('tableBody');
      tbody.innerHTML = '<tr><td colspan="13" style="text-align: center; padding: 20px; color: #94a3b8;">Loading matching observations...</td></tr>';

      try {
        const res = await fetch('/api/data?' + params.toString());
        const data = await res.json();

        tbody.innerHTML = '';

        if (!data.rows || data.rows.length === 0) {
          tbody.innerHTML = '<tr><td colspan="13" style="text-align: center; padding: 24px; color: #f87171;">No matching observations found.</td></tr>';
          document.getElementById('pageInfo').innerText = 'Showing 0 of 0';
          return;
        }

        data.rows.forEach(r => {
          const tr = document.createElement('tr');
          const isSep1 = (r.observation_date === '2026-09-01');
          const obsBadge = isSep1 
            ? `<span class="tag tag-sep1">⭐ 2026-09-01 (Base)</span>` 
            : `<b>${r.observation_date}</b>`;

          tr.innerHTML = `
            <td style="color:#64748b;">${r.id}</td>
            <td>${obsBadge}</td>
            <td>${r.departure_date} ${r.departure_time || ''}</td>
            <td><span class="tag tag-blue">${r.route_code}</span></td>
            <td>${r.airline_name}</td>
            <td><span class="tag tag-purple">${r.flight_number}</span></td>
            <td>₹${Number(r.base_fare).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
            <td>₹${Number(r.user_development_fee_udf + r.passenger_service_fee_psf).toFixed(2)}</td>
            <td>₹${Number(r.gst).toFixed(2)}</td>
            <td>₹${Number(r.total_taxes_fees).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
            <td><b style="color:#38bdf8;">₹${Number(r.total_fare).toLocaleString('en-IN', {minimumFractionDigits: 2})}</b></td>
            <td>T+${r.advance_days}</td>
            <td><span class="tag tag-emerald">${r.data_source}</span></td>
          `;
          tbody.appendChild(tr);
        });

        const start = (currentPage - 1) * limit + 1;
        const end = Math.min(currentPage * limit, data.total);
        document.getElementById('pageInfo').innerText = `Showing ${start}-${end} of ${data.total.toLocaleString()} observations`;

        document.getElementById('prevBtn').disabled = (currentPage === 1);
        document.getElementById('nextBtn').disabled = (end >= data.total);
      } catch (err) {
        console.error('Failed loading data:', err);
        tbody.innerHTML = `<tr><td colspan="13" style="text-align: center; padding: 24px; color: #f87171;">Error loading data: ${err.message}</td></tr>`;
      }
    }

    function filterSep1() {
      document.getElementById('dateSelect').value = '2026-09-01';
      document.getElementById('routeSelect').value = '';
      document.getElementById('sourceSelect').value = '';
      document.getElementById('horizonSelect').value = '';
      document.getElementById('searchInput').value = '';
      currentPage = 1;
      loadData();
    }

    function applyFilters() {
      currentPage = 1;
      loadData();
    }

    function resetFilters() {
      document.getElementById('dateSelect').value = '';
      document.getElementById('routeSelect').value = '';
      document.getElementById('sourceSelect').value = '';
      document.getElementById('horizonSelect').value = '';
      document.getElementById('searchInput').value = '';
      document.getElementById('alertBanner').style.display = 'none';
      currentPage = 1;
      loadData();
    }

    function changePage(delta) {
      currentPage += delta;
      loadData();
    }

    window.onload = async () => {
      await loadStats();
      // Default to showing Sep 1 base data
      document.getElementById('dateSelect').value = '2026-09-01';
      await loadData();
    };
  </script>
</body>
</html>
"""


class AirfareViewerHandler(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == "/" or parsed.path == "/index.html":
            encoded = HTML_PAGE.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(encoded)))
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(encoded)
            return

        if parsed.path == "/api/stats":
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            total = c.execute("SELECT COUNT(*) FROM airfare_observations").fetchone()[0]
            sep1_count = c.execute("SELECT COUNT(*) FROM airfare_observations WHERE observation_date = '2026-09-01'").fetchone()[0]
            dates_min_max = c.execute("SELECT MIN(observation_date), MAX(observation_date) FROM airfare_observations").fetchone()
            all_dates = [d[0] for d in c.execute("SELECT DISTINCT observation_date FROM airfare_observations ORDER BY observation_date").fetchall()]
            routes = [r[0] for r in c.execute("SELECT DISTINCT route_code FROM airfare_observations ORDER BY route_code").fetchall()]
            sources = [s[0] for s in c.execute("SELECT DISTINCT data_source FROM airfare_observations ORDER BY data_source").fetchall()]
            conn.close()

            res = {
                "total_count": total,
                "sep1_count": sep1_count,
                "min_date": dates_min_max[0] if dates_min_max else "N/A",
                "max_date": dates_min_max[1] if dates_min_max else "N/A",
                "dates": all_dates,
                "routes": routes,
                "sources": sources
            }
            encoded = json.dumps(res).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Content-Length", str(len(encoded)))
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(encoded)
            return

        if parsed.path == "/api/data":
            query_params = urllib.parse.parse_qs(parsed.query)
            page = int(query_params.get("page", [1])[0])
            limit = int(query_params.get("limit", [50])[0])
            obs_date = query_params.get("date", [""])[0]
            route = query_params.get("route", [""])[0]
            source = query_params.get("source", [""])[0]
            horizon = query_params.get("horizon", [""])[0]
            search_query = query_params.get("query", [""])[0]

            where_clauses = []
            params = []

            if obs_date:
                where_clauses.append("observation_date = ?")
                params.append(obs_date)
            if route:
                where_clauses.append("route_code = ?")
                params.append(route)
            if source:
                where_clauses.append("data_source = ?")
                params.append(source)
            if horizon:
                where_clauses.append("advance_days = ?")
                params.append(int(horizon))
            if search_query:
                where_clauses.append("(flight_number LIKE ? OR airline_name LIKE ?)")
                params.append(f"%{search_query}%")
                params.append(f"%{search_query}%")

            where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
            offset = (page - 1) * limit

            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()

            total = c.execute(f"SELECT COUNT(*) FROM airfare_observations {where_sql}", params).fetchone()[0]
            rows_sql = f"SELECT * FROM airfare_observations {where_sql} ORDER BY id ASC LIMIT ? OFFSET ?"
            rows = c.execute(rows_sql, params + [limit, offset]).fetchall()
            rows_dict = [dict(r) for r in rows]
            conn.close()

            res = {
                "total": total,
                "page": page,
                "limit": limit,
                "rows": rows_dict
            }
            encoded = json.dumps(res).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Content-Length", str(len(encoded)))
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(encoded)
            return

        self.send_response(404)
        self.send_header("Connection", "close")
        self.end_headers()

    def log_message(self, format, *args):
        return


class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def run_viewer(port=PORT):
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass

    handler = AirfareViewerHandler
    try:
        httpd = ThreadingHTTPServer(("", port), handler)
    except OSError:
        port = 8080
        httpd = ThreadingHTTPServer(("", port), handler)

    url = f"http://localhost:{port}"
    print("=" * 65)
    print("  AIRFARE BACKEND DATA EXPLORER (MULTI-THREADED)")
    print(f"  URL: {url}")
    print("  Default View: September 1, 2026 Base Data (3,750 records)")
    print("  Database: data/airfares.db (64,206+ total records)")
    print("  Press Ctrl+C in your terminal to stop.")
    print("=" * 65)

    try:
        webbrowser.open(url)
    except Exception:
        pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nViewer stopped.")


if __name__ == "__main__":
    run_viewer()
