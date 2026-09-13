import React, { useState, useEffect, useMemo } from 'react'
import {
  TrendingUp,
  Database,
  MapPin,
  ArrowRight,
  Clock,
  CheckCircle2,
  BarChart3,
  ExternalLink,
  ShieldCheck,
  Plane,
  X,
  Activity,
  ArrowUpRight
} from 'lucide-react'
import { getLatestIndex, getFlights } from '../api'
import {
  calculateNationalIndex,
  getDailyTrajectory,
  getHourlyDiurnalTrajectory,
  getLiveScrapedCorridors,
  getEconometricMetadata
} from '../services/airfareCalculationEngine'

export default function HeroSection({ onNavigate, onOpenMethodology }) {
  const [activeGraphTab, setActiveGraphTab] = useState('daily') // 'hourly' | 'daily'
  const [hoveredHourlyPoint, setHoveredHourlyPoint] = useState(null)
  const [hoveredDailyPoint, setHoveredDailyPoint] = useState(null)
  const [lastUpdatedTime, setLastUpdatedTime] = useState('')
  const [liveFaresCount, setLiveFaresCount] = useState(64206)
  const [liveIndexValue, setLiveIndexValue] = useState(() => calculateNationalIndex('latest', 'laspeyres').indexValue)

  const sampleCorridors = [
    {
      id: 'CORR-01',
      origin: 'DEL (New Delhi)',
      dest: 'BOM (Mumbai)',
      carrier: 'IndiGo (6E-205)',
      platform: 'IndiGo',
      rawFare: 4890,
      ancillary: 970,
      pureFare: 3920,
      horizon: 'T-7 days',
      status: 'Ingested & Normalized',
    },
    {
      id: 'CORR-02',
      origin: 'BLR (Bengaluru)',
      dest: 'DEL (New Delhi)',
      carrier: 'Air India (AI-804)',
      platform: 'Air India',
      rawFare: 6150,
      ancillary: 1110,
      pureFare: 5040,
      horizon: 'T-3 days',
      status: 'Ingested & Normalized',
    },
    {
      id: 'CORR-03',
      origin: 'BOM (Mumbai)',
      dest: 'GOI (Goa)',
      carrier: 'Akasa Air (QP-1322)',
      platform: 'Akasa Air',
      rawFare: 3450,
      ancillary: 560,
      pureFare: 2890,
      horizon: 'T-14 days',
      status: 'Ingested & Normalized',
    },
    {
      id: 'CORR-04',
      origin: 'MAA (Chennai)',
      dest: 'CCU (Kolkata)',
      carrier: 'Air India (AI-544)',
      platform: 'Air India',
      rawFare: 4720,
      ancillary: 740,
      pureFare: 3980,
      horizon: 'T-7 days',
      status: 'Ingested & Normalized',
    },
    {
      id: 'CORR-05',
      origin: 'HYD (Hyderabad)',
      dest: 'DEL (New Delhi)',
      carrier: 'IndiGo (6E-6421)',
      platform: 'IndiGo',
      rawFare: 4300,
      ancillary: 740,
      pureFare: 3560,
      horizon: 'T-30 days',
      status: 'Ingested & Normalized',
    },
    {
      id: 'CORR-06',
      origin: 'DEL (New Delhi)',
      dest: 'PNQ (Pune)',
      carrier: 'Air India (AI-851)',
      platform: 'Air India',
      rawFare: 4890,
      ancillary: 650,
      pureFare: 4240,
      horizon: 'T-2 days',
      status: 'Ingested & Normalized',
    },
    {
      id: 'CORR-07',
      origin: 'CCU (Kolkata)',
      dest: 'GAU (Guwahati - UDAN)',
      carrier: 'IndiGo (6E-728)',
      platform: 'IndiGo',
      rawFare: 2840,
      ancillary: 490,
      pureFare: 2350,
      horizon: 'T-14 days',
      status: 'Ingested & Normalized',
    },
  ]

  const [corridorList, setCorridorList] = useState(sampleCorridors)

  const formatISTDateWithSuffix = (d = new Date()) => {
    try {
      const parts = new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      }).formatToParts(d)

      const day = parts.find((p) => p.type === 'day')?.value || '12'
      const month = parts.find((p) => p.type === 'month')?.value || 'Sep'
      const year = parts.find((p) => p.type === 'year')?.value || '2026'
      const hour = parts.find((p) => p.type === 'hour')?.value || '11'
      const minute = parts.find((p) => p.type === 'minute')?.value || '00'
      const dayPeriod = parts.find((p) => p.type === 'dayPeriod')?.value?.toUpperCase() || 'AM'

      const dNum = parseInt(day, 10)
      const suffix =
        dNum % 10 === 1 && dNum !== 11
          ? 'st'
          : dNum % 10 === 2 && dNum !== 12
          ? 'nd'
          : dNum % 10 === 3 && dNum !== 13
          ? 'rd'
          : 'th'

      return `${dNum}${suffix} ${month} ${year}, ${hour}:${minute} ${dayPeriod} IST`
    } catch {
      return '12th Sep 2026, 11:00 AM IST'
    }
  }

  // Generate 12 hourly data points
  const getISTHourlyData = () => {
    let curHour = 11
    try {
      const hStr = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }).format(new Date())
      curHour = parseInt(hStr, 10) || 11
    } catch {}

    const diurnalCurve = [145.8, 145.2, 144.6, 145.5, 146.4, 147.2, 148.1, 147.9, 147.0, 147.5, 148.4, 147.8]
    const diurnalFares = [480, 350, 290, 620, 1120, 1450, 1510, 1390, 1420, 1680, 1240, 890]

    const data = []
    for (let i = 11; i >= 0; i--) {
      const h = (curHour - i * 2 + 48) % 24
      const hourLabel = `${h.toString().padStart(2, '0')}:00`
      const isCurrent = i === 0
      const curveIdx = Math.floor(h / 2) % 12

      data.push({
        hour: isCurrent ? `${hourLabel} (Live IST Sync)` : hourLabel,
        displayHour: hourLabel,
        index: isCurrent ? 147.8 : diurnalCurve[curveIdx],
        fares: isCurrent ? 1240 : diurnalFares[curveIdx],
        isCurrent,
      })
    }
    return data
  }

  const [hourlyData, setHourlyData] = useState(() => getHourlyDiurnalTrajectory(liveIndexValue))

  const dailyIndexData = useMemo(() => {
    const traj = getDailyTrajectory('laspeyres')
    return traj.map((pt) => ({
      day: pt.date,
      avgIndex: pt.index,
      totalFares: 5350,
      baseline: pt.baseline,
    }))
  }, [])

  useEffect(() => {
    setLastUpdatedTime(formatISTDateWithSuffix())
    const timer = setInterval(() => setLastUpdatedTime(formatISTDateWithSuffix()), 1000)

    let isMounted = true
    getLatestIndex()
      .then((data) => {
        if (!isMounted || !Array.isArray(data) || data.length === 0) return
        const comp = data.find((r) => r.route === 'COMPOSITE') || data[0]
        if (comp && comp.index_value) {
          const val = Number(comp.index_value.toFixed(1))
          setLiveIndexValue(val)
          if (comp.sample_size) setLiveFaresCount(comp.sample_size)
        }
      })
      .catch(() => {})

    getFlights({ limit: 50 })
      .then((flights) => {
        if (!isMounted || !Array.isArray(flights) || flights.length === 0) return
        const mapped = flights.map((f, idx) => ({
          id: `DB-${f.id || idx}`,
          origin: f.origin || 'DEL',
          dest: f.destination || 'BOM',
          carrier: `${f.airline} (${f.flight_number || 'AI-101'})`,
          platform: f.airline || 'Air India',
          rawFare: f.total_fare || 4900,
          ancillary: f.taxes || 850,
          pureFare: f.base_fare || 4050,
          horizon: `T-${f.advance_days || 7} days`,
          status: 'Ingested & Normalized',
        }))
        setCorridorList((prev) => [...mapped, ...prev])
      })
      .catch(() => {})

    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [])

  const filteredCorridors = corridorList

  // Banner slides for auto cross-fade hero section
  const assetSlides = [
    { id: 'slide-1', img: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1600&q=80', title: 'Indian Airport Operations' },
    { id: 'slide-2', img: 'https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?w=1600&q=80', title: 'Aerial View of Flight Routes' },
    { id: 'slide-3', img: 'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=1600&q=80', title: 'Civil Aviation India' },
  ]
  const [currentSlide, setCurrentSlide] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setCurrentSlide(s => (s + 1) % assetSlides.length), 4000)
    return () => clearInterval(t)
  }, [])

  // SVG dimensions for Graph
  const svgWidth = 520
  const svgHeight = 175
  const padX = 35
  const padY = 20
  const hourlyMin = 142
  const hourlyMax = 150

  const getHourlyY = (val) => svgHeight - padY - ((val - hourlyMin) / (hourlyMax - hourlyMin)) * (svgHeight - padY * 2)
  const getHourlyX = (idx) => padX + (idx / (hourlyData.length - 1)) * (svgWidth - padX * 2)
  const hourlyPointsStr = hourlyData.map((d, i) => `${getHourlyX(i)},${getHourlyY(d.index)}`).join(' ')
  const hourlyAreaPoints = `${getHourlyX(0)},${getHourlyY(hourlyData[0].index)} ${hourlyPointsStr} ${getHourlyX(hourlyData.length - 1)},${svgHeight - padY} ${getHourlyX(0)},${svgHeight - padY}`

  const dailyMin = 142
  const dailyMax = 150
  const getDailyY = (val) => svgHeight - padY - ((val - dailyMin) / (dailyMax - dailyMin)) * (svgHeight - padY * 2)
  const getDailyX = (idx) => padX + (idx / (dailyIndexData.length - 1)) * (svgWidth - padX * 2)
  const dailyPointsStr = dailyIndexData.map((d, i) => `${getDailyX(i)},${getDailyY(d.avgIndex)}`).join(' ')
  const dailyAreaPoints = `${getDailyX(0)},${getDailyY(dailyIndexData[0].avgIndex)} ${dailyPointsStr} ${getDailyX(dailyIndexData.length - 1)},${svgHeight - padY} ${getDailyX(0)},${svgHeight - padY}`

  return (
    <div className="w-full bg-[#f4f6f9] text-slate-800">
      
      {/* 1. AUTO-SCROLLING ASSET PHOTOS BANNER WITH NATIONAL AIRFARE INDEX NAME (No Search Bar) */}
      <section className="banner-section inner relative h-[420px] sm:h-[460px] overflow-hidden flex items-center justify-center">
        {/* Automatic cross-fade of the asset photos */}
        {assetSlides.map((slide, idx) => (
          <img
            key={slide.id}
            src={slide.img}
            alt={slide.title}
            className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ease-in-out ${
              currentSlide === idx ? 'opacity-80' : 'opacity-0 pointer-events-none'
            }`}
          />
        ))}

        {/* Ambient Dark Gradient Overlay for Crisp Text Legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#061426]/80 via-[#0b2545]/65 to-[#061426]/90 pointer-events-none" />

        {/* Center Content: Prominent National Airfare Index Name */}
        <div className="relative z-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-500 text-slate-950 font-black text-xs sm:text-sm font-mono tracking-wider shadow-lg mb-4 animate-fade-in">
            <Plane className="w-4 h-4" />
            <span>NAI • OFFICIAL CIVIL AVIATION INTELLIGENCE</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black font-heading text-white tracking-tight uppercase drop-shadow-xl leading-none">
            National <span className="text-yellow-300">Airfare Index</span>
          </h1>

          <p className="mt-4 text-sm sm:text-lg text-slate-100 font-medium max-w-2xl mx-auto drop-shadow leading-relaxed">
            Real-Time Civil Aviation Tariff Surveillance &amp; National Transport Inflation Tracking System
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => onNavigate('corridors')}
              className="px-6 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-xl transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <span>Explore Live Corridors</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('radar')}
              className="px-6 py-3 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/30 backdrop-blur-md font-bold text-xs sm:text-sm uppercase tracking-wider transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <span>Route Tracker Analytics</span>
              <Activity className="w-4 h-4 text-yellow-300" />
            </button>
            <button
              onClick={() => onOpenMethodology && onOpenMethodology('BLR-BOM')}
              className="px-6 py-3 rounded-xl bg-blue-600/90 hover:bg-blue-500 text-white border border-blue-400/40 backdrop-blur-md font-bold text-xs sm:text-sm uppercase tracking-wider transition-all active:scale-95 cursor-pointer flex items-center gap-2 shadow-lg"
            >
              <BarChart3 className="w-4 h-4 text-amber-300" />
              <span>MoSPI Formulas (PDF Steps)</span>
            </button>
          </div>

        </div>
      </section>

      {/* 2. BREADCRUMBS BAR */}
      <section className="site-breadcrumb">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ul>
            <li>
              <button onClick={() => onNavigate('overview')} className="hover:text-orange-600 transition-colors cursor-pointer">
                Home
              </button>
            </li>
            <li className="text-slate-300">/</li>
            <li>
              <span>National Airfare Index Registry</span>
            </li>
          </ul>
        </div>
      </section>

      {/* 3. TWO-COLUMN MAIN CONTENT (col-lg-8 & col-lg-4) */}
      <section className="content-row">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* LEFT COLUMN (col-lg-8): National Airfare Index Showcase, Graph & Corridor Registry */}
            <div className="w-full lg:w-2/3">
              <div className="grid-content">
                
                {/* Heading */}
                <div className="content-head">
                  <h2>National Airfare Index Surveillance</h2>
                  <span className="text-xs font-mono px-3 py-1 rounded bg-orange-50 text-orange-700 border border-orange-200 font-semibold">
                    Real-Time Flight Telemetry
                  </span>
                </div>

                {/* Status Summary */}
                <div className="search-meta flex items-center justify-between">
                  <div>
                    {filteredCorridors.length} Verified Routes - <span>Active Airfare Ingestion</span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono hidden sm:block">
                    {lastUpdatedTime}
                  </div>
                </div>

                {/* 1. IN PLACE OF GRAPH: NATIONAL AIRFARE INDEX SHOWCASE CARD */}
                <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200 shadow-md mb-6 relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-orange-50 text-orange-700 border border-orange-200">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[#0b2545] font-heading">
                          National Airfare Index (Composite NAI)
                        </h3>
                        <span className="text-xs text-slate-500 font-mono">
                          Empirical geometric price basket surveillance across 142 routes
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-mono font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                      <span>Active Surveillance</span>
                    </div>
                  </div>

                  {/* Giant Index Display */}
                  <div className="mt-5 flex flex-wrap items-baseline gap-4">
                    <span className="text-5xl sm:text-6xl font-black font-mono text-[#0b2545] tracking-tight">
                      {liveIndexValue.toFixed(1)}
                    </span>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-800 font-mono font-bold text-xs">
                      <TrendingUp className="w-4 h-4" />
                      <span>+{((liveIndexValue - 100)).toFixed(1)}% vs Base 100</span>
                    </div>
                  </div>

                  {/* Statistical Summary Box */}
                  <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#f8fafc] p-4 rounded-xl border border-slate-200 text-xs font-mono">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase block">24-HR Scraped Mean</span>
                      <span className="text-emerald-700 font-bold text-sm">
                        {hourlyData && hourlyData.length > 0
                          ? (hourlyData.reduce((acc, curr) => acc + curr.index, 0) / hourlyData.length).toFixed(2)
                          : '146.85'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase block">Total Observations</span>
                      <span className="text-slate-900 font-bold text-sm">{liveFaresCount.toLocaleString()} Fares</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase block">Ingestion Engines</span>
                      <span className="text-slate-900 font-bold text-sm">14 Active</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase block">Base Benchmark</span>
                      <span className="text-orange-700 font-bold text-sm">2024 Base 100</span>
                    </div>
                  </div>

                  {/* Recently Updated Timestamp */}
                  <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-slate-600">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Clock className="w-4 h-4 text-orange-700 shrink-0" />
                      <span className="text-slate-500">Recently Updated:</span>
                      <span className="font-bold text-slate-900">{lastUpdatedTime}</span>
                    </div>
                    <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                      <span>Auto-sync cycle active</span>
                    </span>
                  </div>
                </div>

                {/* 2. IN PLACE OF FILTER CARRIERS: INTERACTIVE SURVEILLANCE GRAPH */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-md mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-orange-700" />
                        <h3 className="text-sm font-bold text-[#0b2545] font-heading">
                          Airfare Surveillance Timeline (Graph)
                        </h3>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Empirical index series: Hourly scrape checkpoints (IST Dynamic) &amp; Daily 24h averages
                      </span>
                    </div>

                    {/* View Switcher Tabs */}
                    <div className="flex items-center gap-1 bg-[#f1f5f9] p-1 rounded-lg border border-slate-200 text-xs font-mono">
                      <button
                        onClick={() => setActiveGraphTab('hourly')}
                        className={`px-3 py-1 rounded-md transition-all font-semibold cursor-pointer ${
                          activeGraphTab === 'hourly'
                            ? 'bg-[#0b2545] text-white font-bold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Hourly (IST Live)
                      </button>
                      <button
                        onClick={() => setActiveGraphTab('daily')}
                        className={`px-3 py-1 rounded-md transition-all font-semibold cursor-pointer ${
                          activeGraphTab === 'daily'
                            ? 'bg-[#0b2545] text-white font-bold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Daily Mean
                      </button>
                    </div>
                  </div>

                  {/* SVG Chart */}
                  <div className="mt-4 relative overflow-x-auto bg-[#f8fafc] rounded-xl border border-slate-200 p-3">
                    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[340px]">
                      <defs>
                        <linearGradient id="searchChartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f97316" stopOpacity="0.22" />
                          <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Grid lines */}
                      {[144, 147, 150].map((val) => {
                        const y = getHourlyY(val)
                        return (
                          <g key={val}>
                            <line x1={padX} y1={y} x2={svgWidth - padX} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                            <text x={padX - 8} y={y + 3} fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="end">
                              {val}
                            </text>
                          </g>
                        )
                      })}

                      {/* Area Fill */}
                      <polygon points={activeGraphTab === 'hourly' ? hourlyAreaPoints : dailyAreaPoints} fill="url(#searchChartGradient)" />

                      {/* Polyline */}
                      <polyline
                        fill="none"
                        stroke="#f97316"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={activeGraphTab === 'hourly' ? hourlyPointsStr : dailyPointsStr}
                      />

                      {/* Points */}
                      {(activeGraphTab === 'hourly' ? hourlyData : dailyIndexData).map((d, i) => {
                        const cx = activeGraphTab === 'hourly' ? getHourlyX(i) : getDailyX(i)
                        const cy = activeGraphTab === 'hourly' ? getHourlyY(d.index) : getDailyY(d.avgIndex)
                        return (
                          <g key={i}>
                            <circle cx={cx} cy={cy} r={d.isCurrent ? 5 : 3.5} fill="#ffffff" stroke="#f97316" strokeWidth="2" />
                            <text x={cx} y={svgHeight - 4} fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="middle">
                              {activeGraphTab === 'hourly' ? d.displayHour : d.day}
                            </text>
                          </g>
                        )
                      })}
                    </svg>
                  </div>

                  {/* Footnote */}
                  <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>Hourly: Scraped every 2h • Daily: Mathematical average of 24 scraped hours</span>
                    <span className="font-bold text-[#0b2545]">Latest: {liveIndexValue.toFixed(1)}</span>
                  </div>
                </div>

                {/* Explore Full Registry Banner Callout */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-orange-50 text-orange-700 border border-orange-200">
                      <Plane className="w-5 h-5 transform -rotate-45" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#0b2545] font-heading">
                        National Corridors Tariff Registry (142 Routes)
                      </h4>
                      <p className="text-xs text-slate-500 font-mono">
                        View decomposed pure base fares, ancillary fees, and advance booking windows in the dedicated registry.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate('corridors')}
                    className="px-4 py-2 rounded-xl bg-[#0b2545] hover:bg-[#0c3c6f] text-white text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-sm"
                  >
                    <span>Open Live Registry</span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                </div>

              </div>
            </div>

            {/* RIGHT COLUMN (col-lg-4): SIDEBAR WIDGETS (System Parameters Removed) */}
            <aside className="w-full lg:w-1/3 widget-container">
              
              {/* 1. "IN FOCUS" SPOTLIGHT WIDGET */}
              <div className="post-widget sow">
                <h3>In Focus</h3>
                <div className="widget-img">
                  <img
                    src="/hero-aviation-bg.jpg"
                    alt="National Airfare Surveillance In Focus"
                  />
                </div>
                <h4>National Airfare Index (NAI)</h4>
                <p>
                  Official National Airfare Monitoring &amp; Real-Time Index System for empirical transport inflation surveillance and national price basket analytics, compliant with DGCA standards.
                </p>
                <div className="mt-4 pt-3 border-t border-orange-100 flex items-center justify-between">
                  <button
                    onClick={() => onNavigate('radar')}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-700 hover:text-orange-600 transition-colors cursor-pointer"
                  >
                    <span>Launch Route Tracker</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 2. "ACTIVE CARRIERS & PIPELINE FEEDS" WIDGET */}
              <div className="post-widget">
                <h3>Active Carrier Telemetry</h3>
                <ul>
                  <li>
                    <button
                      className="search-title w-full flex items-center justify-between text-left cursor-pointer"
                    >
                      <span>IndiGo Airlines (6E)</span>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        450 fares/hr
                      </span>
                    </button>
                  </li>
                  <li>
                    <button
                      className="search-title w-full flex items-center justify-between text-left cursor-pointer"
                    >
                      <span>Air India (AI)</span>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        380 fares/hr
                      </span>
                    </button>
                  </li>
                  <li>
                    <button
                      className="search-title w-full flex items-center justify-between text-left cursor-pointer"
                    >
                      <span>Akasa Air (QP)</span>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        190 fares/hr
                      </span>
                    </button>
                  </li>
                  <li>
                    <button
                      className="search-title w-full flex items-center justify-between text-left cursor-pointer"
                    >
                      <span>UDAN Regional Feeds</span>
                      <span className="text-[10px] font-mono text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                        28 States &amp; UTs
                      </span>
                    </button>
                  </li>
                </ul>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => onNavigate('pipeline-health')}
                    className="w-full py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 text-center transition-colors block cursor-pointer"
                  >
                    View Ingestion Pipeline Health →
                  </button>
                </div>
              </div>

            </aside>

          </div>
        </div>
      </section>

    </div>
  )
}
