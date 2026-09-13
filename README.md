# AirIndex MoSPI — National Airfare Price Index Platform
### Smart India Hackathon 2026 (SIH 2026) | Problem Statement: SIH26056
**MoSPI Airfare CPI Augmentation System**

---

## 📌 Project Overview
AirIndex MoSPI is a high-frequency, dynamic airfare price index platform engineered for the **Ministry of Statistics & Programme Implementation (MoSPI)**, Government of India. It augments the official Consumer Price Index (CPI) transport indicators by replacing static quarterly surveys with automated, empirical, fee-normalized airfare surveillance.

This repository contains the complete **100% Pure React (JavaScript / JSX)** frontend application with zero backend or server dependencies.

---

## 🚀 Quick Start (For Team Members)

### 1. Prerequisites
- Node.js (v18 or higher recommended)
- npm

### 2. Installation
Clone the repository and install frontend dependencies:
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open your browser and navigate to: **`http://localhost:5173/`**

### 4. Build for Production
```bash
npm run build
```

---

## 📂 Clean Repository Structure

```
frontend/
├── public/
│   └── favicon.svg               # Official MoSPI browser tab icon
├── src/
│   ├── components/
│   │   ├── HeaderBanner.jsx       # Emblem text, Ministry details & live IST clock
│   │   ├── Navbar.jsx             # Discrete tab-based navigation (zero scrolling)
│   │   ├── HeroSection.jsx        # 50/50 National Airfare Index, Graph & Timestamp
│   │   ├── LivePipelineHealth.jsx # Per-airline performance bars (Active/Failed status)
│   │   ├── LiveDemoTable.jsx      # National Corridor Registry with carrier filter & search
│   │   ├── Dashboard.jsx          # Page 2: Core Executive CPI Analytics Dashboard
│   │   ├── RouteAnalytics.jsx     # Page 3: Route Analytics & Interactive Flight Radar
│   │   └── Footer.jsx             # Official MoSPI footer & SIH26056 metadata
│   ├── App.jsx                    # Root view controller (Overview, Pipeline, Corridors, Radar, Dashboard)
│   ├── main.jsx                   # React 19 root entry point
│   └── style.css                  # Custom cyber grid & glassmorphism theme
├── index.html                     # HTML root with Tailwind CSS & Google Fonts
├── package.json                   # Frontend dependencies (React 19, Lucide React, Vite)
├── vite.config.js                 # Vite bundler configuration
└── .gitignore                     # Git exclusion rules (node_modules, dist, logs)
```

---

## 🧭 Page Views & Navigation Guide

The application features **instant tab-based navigation** without continuous vertical scrolling:

1. **Page 1: Overview & Public Portal**
   - **50/50 Showcase**: National Airfare Index (`118.4 | +18.4% vs Base`) alongside a 30-day interactive SVG trajectory graph.
   - **Recent Timestamp**: Live synced update date and time.
   - **Key Indicators**: Daily Fares Collected (`12,450`), Monitored Corridors (`142`), and Inflation Rate (`5.82%`).

2. **Pipeline Health View**
   - Per-airline performance bars (**IndiGo, Air India, SpiceJet, Akasa Air, MakeMyTrip, EaseMyTrip, Alliance Air**).
   - Real-time status indicators (**`Active`** / **`Failed`**).
   - Standardized Performance metric measuring extraction speed, reliability, and throughput without slowing down.

3. **Live Corridors View**
   - Filterable, searchable National Corridor Registry Table decomposing raw listed tariffs into normalized base pure fares.

4. **Page 2: Core Executive Dashboard**
   - Formula toggle: Jevons (*Unweighted Geometric Mean*) vs. Laspeyres (*Passenger Volume Weighted*).
   - Advance booking horizon filters (`0–3D`, `7D`, `15D`, `30D`).
   - Time-series line chart vs. official CPI baseline (100.0).
   - Peak surge spikes bar chart.
   - Live scraper telemetry stream terminal.
   - One-click **"Export MoSPI CPI Report (.CSV)"** download.

5. **Page 3: Route Analytics & Flight Radar**
   - Live corridor flight radar with animated airport beacons (`DEL` ✈️ `BOM`).
   - Interactive carrier comparison table (Direct Airlines vs. OTAs) isolating convenience fees.
   - Advance departure window escalation curve (30 days &rarr; 15 days &rarr; 7 days &rarr; Same day).

---

## 🛠️ Technology Stack
- **Framework**: React 19 (JavaScript / JSX)
- **Bundler**: Vite 8 with `@vitejs/plugin-react`
- **Styling**: Tailwind CSS + Custom Vanilla Glassmorphic CSS
- **Icons**: Lucide React
- **Typography**: Outfit, Inter, JetBrains Mono
- **Backend Dependency**: **None** (100% self-contained frontend)

---

## 👥 Team
- **Project**: AirIndex MoSPI
- **Hackathon**: Smart India Hackathon 2026 (Grand Finale)
- **Problem Statement**: SIH26056
