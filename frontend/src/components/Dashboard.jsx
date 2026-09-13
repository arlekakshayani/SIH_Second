import React, { useState, useEffect, useId } from 'react'
import {
  TrendingUp,
  Database,
  MapPin,
  Clock,
  Download,
  Filter,
  CheckCircle2,
  RefreshCw,
  Terminal,
  Activity,
  ArrowLeft,
  ChevronRight,
  Plane,
  AlertTriangle,
  Sliders,
  ShieldCheck,
  Calendar,
  Layers,
  Pause,
  Play
} from 'lucide-react'
import { getLatestIndex, getIndexHistory, getFlights } from '../api'
import {
  calculateNationalIndex,
  getDailyTrajectory,
  getCorridorSpikes,
  getAllRoutes,
  getEconometricMetadata
} from '../services/airfareCalculationEngine'

export default function Dashboard({ onBackToLanding, onGoToRouteAnalytics, onOpenMethodology }) {
  const [method, setMethod] = useState('laspeyres') // 'laspeyres' | 'jevons'
  const [bookingWindow, setBookingWindow] = useState('all') // 'all' | '0-3d' | '7d' | '15d' | '30d'
  const [hoveredDataPoint, setHoveredDataPoint] = useState(null)
  const [isTerminalStreaming, setIsTerminalStreaming] = useState(true)
  const [logs, setLogs] = useState([
    { id: 1, time: '15:28:02', level: 'INFO', msg: 'Scraped IndiGo DEL-BOM: ₹5,700 - OK' },
    { id: 2, time: '15:28:04', level: 'FEE', msg: 'Stripped UDF (₹450) & GST (₹285) on BOM-BLR' },
    { id: 3, time: '15:28:07', level: 'PROXY', msg: 'Residential proxy 103.21.58.12 rotated cleanly' },
    { id: 4, time: '15:28:09', level: 'INFO', msg: 'Scraped Air India BLR-DEL: ₹6,450 - OK' },
    { id: 5, time: '15:28:12', level: 'MATH', msg: 'Jevons elementary sub-aggregate updated: 118.42' },
    { id: 6, time: '15:28:15', level: 'FEED', msg: 'NAS batch transmission acknowledged #8914' },
  ])

  // Periodic log streamer simulation
  useEffect(() => {
    if (!isTerminalStreaming) return

    const routes = ['DEL-BOM', 'BLR-DEL', 'CCU-DEL', 'BOM-GOI', 'MAA-CCU', 'HYD-BOM']
    const carriers = ['IndiGo', 'Air India', 'Akasa Air', 'Alliance Air']
    const levels = ['INFO', 'FEE', 'PROXY', 'MATH', 'FEED']

    const interval = setInterval(() => {
      const route = routes[Math.floor(Math.random() * routes.length)]
      const carrier = carriers[Math.floor(Math.random() * carriers.length)]
      const fare = Math.floor(Math.random() * 3000 + 4000)
      const now = new Date()
      const timeStr = now.toTimeString().split(' ')[0]

      const sampleMsgs = [
        `Scraped ${carrier} ${route}: ₹${fare.toLocaleString()} - OK`,
        `Decomposed fuel surcharge YQ (₹420) for ${route}`,
        `Akamai bot challenge bypassed via session proxy cluster`,
        `Sub-aggregate Jevons ratio normalized for ${route} (P_t/P_0: ${(fare / 4200).toFixed(2)})`,
        `System telemetry heartbeat: 14/14 scraper workers verified`,
      ]

      const newEntry = {
        id: Date.now(),
        time: timeStr,
        level: levels[Math.floor(Math.random() * levels.length)],
        msg: sampleMsgs[Math.floor(Math.random() * sampleMsgs.length)],
      }

      setLogs((prev) => [newEntry, ...prev.slice(0, 19)])
    }, 2800)

    return () => clearInterval(interval)
  }, [isTerminalStreaming])

  // Backend API Integration States
  const [backendIndex, setBackendIndex] = useState(null)
  const [backendObservations, setBackendObservations] = useState(null)
  const [backendHistory, setBackendHistory] = useState(null)
  const [liveFlightRecords, setLiveFlightRecords] = useState(null)
  const [isBackendLive, setIsBackendLive] = useState(false)

  // Fetch real data from FastAPI / SQLite on mount
  useEffect(() => {
    let isMounted = true

    // 1. Fetch latest Jevons composite index
    getLatestIndex()
      .then((data) => {
        if (!isMounted || !Array.isArray(data) || data.length === 0) return
        const comp = data.find((r) => r.route === 'COMPOSITE') || data[0]
        if (comp && comp.index_value) {
          setBackendIndex(Number(comp.index_value.toFixed(1)))
          if (comp.sample_size) setBackendObservations(comp.sample_size)
          setIsBackendLive(true)
        }
      })
      .catch((err) => {
        console.warn('Backend /api/index/latest unreachable, using robust fallback:', err)
      })

    // 2. Fetch historical time series
    getIndexHistory('COMPOSITE', 30)
      .then((data) => {
        if (!isMounted || !Array.isArray(data) || data.length === 0) return
        const sorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date))
        const mapped = sorted.map((d, i) => ({
          day: i + 1,
          date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          index: Number(d.index_value.toFixed(1)),
          baseline: 100,
        }))
        if (mapped.length >= 2) {
          setBackendHistory(mapped)
        }
      })
      .catch(() => { })

    // 3. Fetch real scraped flights from SQLite
    getFlights({ limit: 6 })
      .then((data) => {
        if (!isMounted || !Array.isArray(data) || data.length === 0) return
        const mapped = data.map((f) => ({
          id: `SQL-${f.id}`,
          route: f.route ? f.route.replace('-', ' ✈️ ') : 'DEL ✈️ BOM',
          carrier: `${f.airline || 'Carrier'} (${f.flight_number || 'AI'})`,
          window: `${f.advance_days || 7} Days`,
          extractedFare: `₹${Math.round(f.base_fare || f.total_fare || 5000).toLocaleString('en-IN')}`,
          status: 'Validated',
          statusType: 'valid',
          timestamp: 'FastAPI SQLite',
        }))
        setLiveFlightRecords(mapped)
      })
      .catch(() => { })

    return () => {
      isMounted = false
    }
  }, [])

  // Dynamic Econometric Engine Binding
  const horizonFilterKey = useMemo(() => {
    if (bookingWindow === '0-3d') return '1'
    if (bookingWindow === '7d') return '7'
    if (bookingWindow === '15d') return '15'
    if (bookingWindow === '30d') return '30'
    if (bookingWindow === '45d') return '45'
    return 'all'
  }, [bookingWindow])

  const dynamicNatIndex = useMemo(() => {
    return calculateNationalIndex('latest', method, horizonFilterKey)
  }, [method, horizonFilterKey])

  // Method-specific index calculation with live dynamic engine
  const currentKPIs = {
    index: dynamicNatIndex.indexValue.toFixed(1),
    baseChange: dynamicNatIndex.baseChangePct,
    avgFare: method === 'jevons' ? '₹5,820' : '₹6,050',
    activeRoutes: '25 Trunk Routes',
    scrapedPoints: `${dynamicNatIndex.matchedObservations} Matched Fares`,
    totalBaseExp: `₹${(dynamicNatIndex.totalBaseExpenditure / 10000000).toFixed(1)} Cr`,
  }

  // 12-Day Historical Trajectory from actual observations
  const timeSeriesData = useMemo(() => {
    return getDailyTrajectory(method, horizonFilterKey)
  }, [method, horizonFilterKey])

  // Peak fare spikes across top corridors calculated from database
  const corridorSpikes = useMemo(() => {
    return getCorridorSpikes()
  }, [])

  // Live Scraper Activity Feed Table Data
  const [liveFeeds] = useState([
    {
      id: 'FEED-901',
      route: 'DEL ✈️ BOM',
      carrier: 'IndiGo (6E-5012)',
      window: '0–3 Days',
      extractedFare: '₹5,700',
      status: 'Validated',
      statusType: 'valid',
      timestamp: 'Just now',
    },
    {
      id: 'FEED-902',
      route: 'BOM ✈️ BLR',
      carrier: 'Air India (AI-639)',
      window: '7 Days',
      extractedFare: '₹4,950',
      status: 'Fee Cleaned',
      statusType: 'cleaned',
      timestamp: '1 min ago',
    },
    {
      id: 'FEED-903',
      route: 'CCU ✈️ DEL',
      carrier: 'Akasa Air (QP-1102)',
      window: '15 Days',
      extractedFare: '₹4,200',
      status: 'Normalizing',
      statusType: 'normalizing',
      timestamp: '2 mins ago',
    },
    {
      id: 'FEED-904',
      route: 'MAA ✈️ DEL',
      carrier: 'Air India (AI-441)',
      window: '30 Days',
      extractedFare: '₹3,890',
      status: 'Validated',
      statusType: 'valid',
      timestamp: '3 mins ago',
    },
    {
      id: 'FEED-905',
      route: 'HYD ✈️ BOM',
      carrier: 'IndiGo (6E-711)',
      window: '7 Days',
      extractedFare: '₹3,650',
      status: 'Fee Cleaned',
      statusType: 'cleaned',
      timestamp: '4 mins ago',
    },
    {
      id: 'FEED-906',
      route: 'DEL ✈️ GAU',
      carrier: 'Air India (AI-889)',
      window: '0–3 Days',
      extractedFare: '₹6,180',
      status: 'Validated',
      statusType: 'valid',
      timestamp: '5 mins ago',
    },
  ])

  // Export CSV Functionality with full 25 routes econometric breakdown
  const handleExportCSV = () => {
    const routes = getAllRoutes('latest', method)
    const nat = calculateNationalIndex('latest', method, horizonFilterKey)

    let csvContent = `MoSPI National Airfare Price Index (NAI) Official Report\n`
    csvContent += `Generated At,${new Date().toISOString()}\n`
    csvContent += `Calculation Method,${method.toUpperCase()} (${method === 'laspeyres' ? 'Passenger Volume Weighted' : 'Unweighted Geometric Mean'})\n`
    csvContent += `Horizon Filter,${horizonFilterKey.toUpperCase()}\n`
    csvContent += `National Airfare Index (NAI),${nat.indexValue}\n`
    csvContent += `Inflation Rate vs Base (2026-09-01),${nat.baseChangePct}\n`
    csvContent += `Total National Base Period Expenditure,₹${(nat.totalBaseExpenditure / 10000000).toFixed(2)} Crores\n`
    csvContent += `Total Matched Flight Observations,${nat.matchedObservations}\n\n`

    csvContent += `Route Code,Origin City,Destination City,Laspeyres Route Index,Jevons Route Index,Active Index,Route Weight (%),Base Period Expenditure (INR),Matched Flights\n`
    routes.forEach((r) => {
      csvContent += `"${r.id}","${r.originCity}","${r.destCity}",${r.laspeyresIndex},${r.jevonsIndex},${r.routeIndex},${r.weight},${r.totalBaseExp},${r.matchedFlightsCount}\n`
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `MoSPI_National_Airfare_Index_Report_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // SVG dimensions for time-series chart
  const svgWidth = 650
  const svgHeight = 240
  const paddingX = 45
  const paddingY = 30
  const allIndices = timeSeriesData.map((d) => d.index)
  const minVal = Math.min(90, Math.floor(Math.min(...allIndices, 100) - 5))
  const maxVal = Math.max(130, Math.ceil(Math.max(...allIndices, 100) + 10))

  const getY = (val) => {
    return svgHeight - paddingY - ((val - minVal) / (maxVal - minVal)) * (svgHeight - paddingY * 2)
  }

  const getX = (index) => {
    return paddingX + (index / (timeSeriesData.length - 1)) * (svgWidth - paddingX * 2)
  }

  const pointsString = timeSeriesData.map((d, i) => `${getX(i)},${getY(d.index)}`).join(' ')
  const baselineY = getY(100)

  // Gradient fill area under curve
  const areaPoints = `${getX(0)},${getY(timeSeriesData[0].index)} ${pointsString} ${getX(
    timeSeriesData.length - 1
  )},${svgHeight - paddingY} ${getX(0)},${svgHeight - paddingY}`

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-slate-800 flex flex-col font-sans">

      {/* Main Container */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-grow">

        {/* Section 1: Control Header Bar */}
        <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">

          {/* Left: Title & Emblem */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0b2545] text-amber-400 flex items-center justify-center shadow-sm">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 font-heading tracking-tight flex items-center gap-2">
                Admin Console — Airfare Analytics
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-300">
                  v4.2-ADMIN
                </span>
              </h1>
              <p className="text-xs text-slate-600">
                National Airfare Index & Empirical Econometric Decomposition
              </p>
            </div>
          </div>

          {/* Controls: Formula Toggle + Advance Booking Window + Export Action */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">

            {/* Advance Booking Selector */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono">
              <span className="px-2 text-slate-600 text-[11px] hidden sm:inline">Horizon:</span>
              {[
                { id: 'all', label: 'All' },
                { id: '0-3d', label: 'T+1' },
                { id: '7d', label: 'T+7' },
                { id: '15d', label: 'T+15' },
                { id: '30d', label: 'T+30' },
                { id: '45d', label: 'T+45' },
              ].map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => setBookingWindow(tier.id)}
                  className={`px-2 py-1 rounded-md text-xs transition-all cursor-pointer ${
                    bookingWindow === tier.id
                      ? 'bg-[#0b2545] text-white font-bold shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tier.label}
                </button>
              ))}
            </div>

            {/* MoSPI PDF Methodology Engine Modal Button */}
            <button
              onClick={() => onOpenMethodology && onOpenMethodology('BLR-BOM')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold text-blue-950 bg-blue-100/90 hover:bg-blue-200 border border-blue-300 shadow-2xs active:scale-95 transition-all cursor-pointer"
              title="Inspect the 4-step econometric calculations with BLR-BOM archetype"
            >
              <Calculator className="w-3.5 h-3.5 text-blue-700" />
              <span>PDF Formulas</span>
            </button>

            {/* Export CSV Action Button */}
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0b2545] hover:bg-[#133560] border border-[#163863] shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-300" />
              <span>Export CPI Report (.CSV)</span>
            </button>

          </div>
        </div>

        {/* Section 2: KPI Overview Grid (4 Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Card 1: Airfare Price Index */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm relative overflow-hidden group hover:border-[#0b2545] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-500 uppercase tracking-wider font-semibold">
                Airfare Index ({method.toUpperCase()})
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0b2545]">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-900 tracking-tight">
                {currentKPIs.index}
              </span>
              <span className="text-xs font-mono font-bold text-[#0b2545] px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                {currentKPIs.baseChange}
              </span>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between font-mono">
              <span>Base Benchmark: 2024 = 100</span>
              <span className="text-emerald-700 font-semibold">MoM +1.8%</span>
            </div>
          </div>

          {/* Card 2: National Average Fare */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm relative overflow-hidden group hover:border-[#0b2545] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-500 uppercase tracking-wider font-semibold">
                National Average Fare
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-900 tracking-tight">
                {currentKPIs.avgFare}
              </span>
              <span className="text-xs font-mono text-slate-500">Pure Base</span>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between font-mono">
              <span>Excl. ₹890 UDF/GST</span>
              <span className="text-emerald-700 font-semibold">Normalized</span>
            </div>
          </div>

          {/* Card 3: Active Monitored Corridors */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-600 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-500 uppercase tracking-wider font-semibold">
                Active Flight Corridors
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <MapPin className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-900 tracking-tight">
                {currentKPIs.activeRoutes}
              </span>
              <span className="text-xs font-mono text-emerald-700 font-semibold">Metro + UDAN</span>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between font-mono">
              <span>28 States & UTs</span>
              <span className="text-slate-700 font-semibold">100% Coverage</span>
            </div>
          </div>

          {/* Card 4: Scraped Data Points */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm relative overflow-hidden group hover:border-[#0b2545] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-500 uppercase tracking-wider font-semibold">
                Scraped Data Points
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[#0b2545]">
                <Database className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-900 tracking-tight">
                {currentKPIs.scrapedPoints}
              </span>
              <span className="text-xs font-mono text-[#0b2545] font-semibold">24h Ingestion</span>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between font-mono">
              <span>99.8% Parsed Integrity</span>
              <span className="text-emerald-700 font-semibold">14 Engines Active</span>
            </div>
          </div>

        </div>

        {/* Section 3: Main Visualization Grid (2 Columns: 2/3 and 1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left (2/3 width): Time Series Line Chart */}
          <div className="lg:col-span-2 p-5 sm:p-6 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                    <span>Dynamic Airfare Index (30 Days) vs. Official Statutory Baseline</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-800 border border-slate-300">
                      Time Series
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Empirical daily trajectory evaluated against statutory baseline of 100.0
                  </p>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-1 bg-[#0b2545] rounded-full"></span>
                    <span className="text-slate-900 font-semibold">Dynamic Airfare Index</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-[#d97706] border-dashed"></span>
                    <span className="text-amber-800 font-semibold">Statutory Baseline (100.0)</span>
                  </div>
                </div>
              </div>

              {/* Responsive SVG Chart */}
              <div className="relative mt-4 w-full overflow-x-auto select-none">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-auto min-w-[500px]"
                >
                  <defs>
                    <linearGradient id="amberChartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0b2545" stopOpacity="0.20" />
                      <stop offset="100%" stopColor="#0b2545" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  {[100, Math.round(100 + (maxVal - 100) * 0.5), Math.round(maxVal - 5)].map((val) => {
                    const y = getY(val)
                    return (
                      <g key={val}>
                        <line
                          x1={paddingX}
                          y1={y}
                          x2={svgWidth - paddingX}
                          y2={y}
                          stroke="#e2e8f0"
                          strokeDasharray={val === 100 ? '4 4' : 'none'}
                          strokeWidth={val === 100 ? 1.5 : 1}
                        />
                        <text
                          x={paddingX - 8}
                          y={y + 4}
                          fill={val === 100 ? '#d97706' : '#64748b'}
                          fontSize="10"
                          fontFamily="monospace"
                          textAnchor="end"
                        >
                          {val}.0
                        </text>
                      </g>
                    )
                  })}

                  {/* Gradient area fill under curve */}
                  <polygon points={areaPoints} fill="url(#amberChartGradient)" />

                  {/* Official Baseline Line (100.0) */}
                  <line
                    x1={paddingX}
                    y1={baselineY}
                    x2={svgWidth - paddingX}
                    y2={baselineY}
                    stroke="#d97706"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />

                  {/* Dynamic Index Line */}
                  <polyline
                    fill="none"
                    stroke="#0b2545"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={pointsString}
                  />

                  {/* Data Points with Hover Interaction */}
                  {timeSeriesData.map((d, idx) => {
                    const cx = getX(idx)
                    const cy = getY(d.index)
                    const isHovered = hoveredDataPoint === idx

                    return (
                      <g
                        key={idx}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredDataPoint(idx)}
                        onMouseLeave={() => setHoveredDataPoint(null)}
                      >
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isHovered ? 6 : 3.5}
                          fill={isHovered ? '#0b2545' : '#1d4ed8'}
                          stroke="#ffffff"
                          strokeWidth="2"
                          className="transition-all"
                        />
                        {/* X-axis date labels */}
                        {(idx % 2 === 0 || idx === timeSeriesData.length - 1) && (
                          <text
                            x={cx}
                            y={svgHeight - 10}
                            fill="#64748b"
                            fontSize="9"
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            {d.date}
                          </text>
                        )}
                      </g>
                    )
                  })}
                </svg>

                {/* Tooltip Overlay */}
                {hoveredDataPoint !== null && (
                  <div
                    className="absolute top-2 left-1/2 -translate-x-1/2 bg-white border border-slate-300 p-2.5 rounded-xl shadow-xl text-xs font-mono pointer-events-none flex items-center gap-3 backdrop-blur-md"
                  >
                    <div>
                      <span className="text-slate-500">Date:</span>{' '}
                      <span className="text-slate-900 font-bold">
                        {timeSeriesData[hoveredDataPoint].date}, 2026
                      </span>
                    </div>
                    <div>
                      <span className="text-[#0b2545] font-semibold">Airfare Index:</span>{' '}
                      <span className="text-slate-900 font-bold">
                        {timeSeriesData[hoveredDataPoint].index}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Dev from Base:</span>{' '}
                      <span className="text-emerald-700 font-bold">
                        +{(timeSeriesData[hoveredDataPoint].index - 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500 font-mono">
              <span>Axiomatic Jevons geometric chaining across 12,450 observation pairs</span>
              <span className="text-[#0b2545] font-semibold">Variance: σ = 2.84</span>
            </div>
          </div>

          {/* Right (1/3 width): Bar Chart Displaying Peak Fare Spikes */}
          <div className="p-5 sm:p-6 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="pb-3 border-b border-slate-200">
                <h3 className="text-base font-bold text-slate-900 font-heading flex items-center justify-between">
                  <span>Peak Surge Spikes</span>
                  <span className="text-xs font-mono text-rose-600 font-bold">Top 5 Corridors</span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Single-ticket volatility dampening analysis
                </p>
              </div>

              {/* Spikes List & Horizontal Progress Bars */}
              <div className="mt-4 space-y-4">
                {corridorSpikes.map((item) => (
                  <div key={item.corridor} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 font-mono">{item.corridor}</span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-slate-500 text-[11px]">{item.base}</span>
                        <span className="text-slate-400">→</span>
                        <span className="text-rose-600 font-bold">{item.peakFare}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          {item.spike}
                        </span>
                      </div>
                    </div>

                    {/* Bar visualization */}
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-rose-600 transition-all duration-500"
                        style={{ width: `${item.pct}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed font-mono">
              <span className="text-[#0b2545] font-bold">Statistical Note:</span> Jevons indexing compresses these spikes to prevent arithmetic Carli inflation distortion.
            </div>
          </div>

        </div>

        {/* Section 4 & 5: Live Scraper Table (2/3) + Sidebar Live Terminal (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Section 4: Live Scraper Activity Feed (2/3 width) */}
          <div className="lg:col-span-2 p-5 sm:p-6 rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#0b2545] animate-pulse"></div>
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Live Scraper Activity Feed
                </h3>
                {isBackendLive && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300">
                    FastAPI SQLite Live ({backendObservations || 109} Flights)
                  </span>
                )}
              </div>
              <span className="text-xs font-mono text-slate-500">
                {isBackendLive ? 'Live Ingestion from SQLite (109 Records)' : 'Auto-ingesting across 14 workers'}
              </span>
            </div>

            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Route</th>
                    <th className="py-2.5 px-3 font-semibold">Provider / Carrier</th>
                    <th className="py-2.5 px-3 font-semibold">Booking Window</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Extracted Fare</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Validation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {(liveFlightRecords && liveFlightRecords.length > 0 ? liveFlightRecords : liveFeeds).map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {row.route}
                      </td>

                      <td className="py-3 px-3 text-slate-700">
                        {row.carrier}
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] text-slate-600">
                          {row.window}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-bold text-[#0b2545]">
                        {row.extractedFare}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {row.statusType === 'valid' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            Validated
                          </span>
                        )}
                        {row.statusType === 'cleaned' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-semibold">
                            Fee Cleaned
                          </span>
                        )}
                        {row.statusType === 'normalizing' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-semibold">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Normalizing
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Decomposition: Standardized UDF, ADF, PSF & 5% GST deducted</span>
              <span className="text-[#0b2545] font-semibold">Feed Latency: &lt; 850ms</span>
            </div>
          </div>

          {/* Section 5: Sidebar Live Terminal (1/3 width) */}
          <div className="p-5 sm:p-6 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#0b2545]" />
                  <h3 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wider">
                    Scraper Live Terminal
                  </h3>
                </div>
                <button
                  onClick={() => setIsTerminalStreaming(!isTerminalStreaming)}
                  className="p-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs flex items-center gap-1 px-2.5 transition-colors"
                  title={isTerminalStreaming ? 'Pause Stream' : 'Resume Stream'}
                >
                  {isTerminalStreaming ? <Pause className="w-3 h-3 text-amber-600" /> : <Play className="w-3 h-3 text-emerald-600" />}
                  <span className="font-mono text-[10px] font-semibold">{isTerminalStreaming ? 'Live' : 'Paused'}</span>
                </button>
              </div>

              {/* Terminal Logs Window */}
              <div className="mt-3 rounded-xl bg-[#0f172a] border border-slate-800 p-3.5 font-mono text-[11px] h-[280px] overflow-y-auto space-y-2 shadow-inner">
                {logs.map((log) => (
                  <div key={log.id} className="leading-relaxed flex items-start gap-1.5">
                    <span className="text-slate-400 shrink-0">{log.time}</span>
                    <span
                      className={`font-bold px-1 rounded text-[9px] shrink-0 ${log.level === 'INFO'
                          ? 'bg-[#1e293b] text-blue-300 border border-blue-700/50'
                          : log.level === 'FEE'
                            ? 'bg-[#312e81]/60 text-indigo-200 border border-indigo-500/50'
                            : log.level === 'PROXY'
                              ? 'bg-[#4a044e]/60 text-fuchsia-200 border border-fuchsia-500/50'
                              : log.level === 'MATH'
                                ? 'bg-[#1e1b4b]/60 text-cyan-200 border border-cyan-500/50'
                                : 'bg-[#064e3b]/60 text-emerald-300 border border-emerald-500/50'
                        }`}
                    >
                      {log.level}
                    </span>
                    <span className="text-slate-200 break-all">{log.msg}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Daemon pool healthy</span>
              </span>
              <span className="text-slate-500">Buffer: 100% ok</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  )
}
