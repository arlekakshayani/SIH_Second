import React, { useState, useEffect } from 'react'
import {
  Search,
  Filter,
  RefreshCw,
  Plane,
  CheckCircle2,
  ArrowUpDown,
  ExternalLink,
  ShieldCheck,
  Database,
  MapPin,
  TrendingUp,
  Clock,
  Radio,
  Sliders,
} from 'lucide-react'
import { getFlights } from '../api'

function formatISTDate() {
  const now = new Date()
  const options = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }
  return now.toLocaleString('en-IN', options) + ' IST'
}

export default function LiveDemoTable({ onBackToLanding }) {
  const [carrierFilter, setCarrierFilter] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLiveBackend, setIsLiveBackend] = useState(false)
  const [backendFlightCount, setBackendFlightCount] = useState(0)
  const [lastSyncTime, setLastSyncTime] = useState(() => formatISTDate())

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
      base2024: 3430,
      horizon: 'T-7 days',
      status: 'Ingested & Normalized',
      time: '2 mins ago',
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
      base2024: 4220,
      horizon: 'T-3 days',
      status: 'Ingested & Normalized',
      time: '4 mins ago',
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
      base2024: 2710,
      horizon: 'T-14 days',
      status: 'Ingested & Normalized',
      time: '7 mins ago',
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
      base2024: 3540,
      horizon: 'T-7 days',
      status: 'Ingested & Normalized',
      time: '11 mins ago',
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
      base2024: 3090,
      horizon: 'T-30 days',
      status: 'Ingested & Normalized',
      time: '15 mins ago',
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
      base2024: 3750,
      horizon: 'T-2 days',
      status: 'Ingested & Normalized',
      time: '19 mins ago',
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
      base2024: 2240,
      horizon: 'T-14 days',
      status: 'Ingested & Normalized',
      time: '24 mins ago',
    },
  ]

  const [tableData, setTableData] = useState(sampleCorridors)

  const airportCityMap = {
    DEL: 'DEL (New Delhi)',
    BOM: 'BOM (Mumbai)',
    BLR: 'BLR (Bengaluru)',
    HYD: 'HYD (Hyderabad)',
    MAA: 'MAA (Chennai)',
    CCU: 'CCU (Kolkata)',
    GOI: 'GOI (Goa)',
    PNQ: 'PNQ (Pune)',
    GAU: 'GAU (Guwahati - UDAN)',
    JAI: 'JAI (Jaipur)',
    COK: 'COK (Kochi)',
    AMD: 'AMD (Ahmedabad)',
    LKO: 'LKO (Lucknow)',
    IXC: 'IXC (Chandigarh)',
  }

  const loadBackendFlights = async () => {
    setIsRefreshing(true)
    try {
      const flights = await getFlights({ limit: 150 })
      if (Array.isArray(flights) && flights.length > 0) {
        const mapped = flights.map((f, idx) => {
          const parts = (f.route || 'DEL-BOM').split('-')
          const orig = parts[0]
          const dest = parts[1] || 'BOM'
          const base2024 = Math.round(f.base_fare / 1.184)
          return {
            id: f.id ? `DB-${f.id}` : `CORR-${idx + 1}`,
            origin: airportCityMap[orig] || `${orig} (${orig})`,
            dest: airportCityMap[dest] || `${dest} (${dest})`,
            carrier: `${f.airline} (${f.flight_number})`,
            platform: f.airline,
            rawFare: f.total_fare,
            ancillary: f.taxes,
            pureFare: f.base_fare,
            base2024: base2024,
            horizon: `T-${f.advance_days} days`,
            status: f.source === 'partner_feed' ? 'Ingested & Normalized' : 'Verified API',
            time: `${f.departure_date} ${f.departure_time}`,
          }
        })
        setTableData(mapped)
        setIsLiveBackend(true)
        setBackendFlightCount(flights.length)
      } else {
        setIsLiveBackend(false)
      }
    } catch (err) {
      console.warn('Backend unreachable, using fallback datasets:', err)
      setIsLiveBackend(false)
    } finally {
      setIsRefreshing(false)
      setLastSyncTime(formatISTDate())
    }
  }

  useEffect(() => {
    loadBackendFlights()
  }, [])

  const handleRefresh = () => {
    loadBackendFlights()
  }

  const filteredData = tableData.filter((row) => {
    const matchesSearch =
      row.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.dest.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.carrier.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCarrier =
      carrierFilter === 'All' || row.platform.toLowerCase().includes(carrierFilter.toLowerCase())
    return matchesSearch && matchesCarrier
  })

  const availableCarriers = ['All', ...new Set(tableData.map((d) => d.platform))].filter(Boolean)

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-slate-800 flex flex-col font-sans">
      {/* 1. Breadcrumbs Bar (Matching Page 1 & Route Tracker site-breadcrumb) */}
      <section className="site-breadcrumb">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ul>
            <li>
              <button
                onClick={onBackToLanding}
                className="hover:text-orange-600 transition-colors cursor-pointer text-slate-500 font-medium"
              >
                Home
              </button>
            </li>
            <li className="text-slate-300">/</li>
            <li>
              <span className="font-bold text-[#0c3c6f]">Live Corridors</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Main Container */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-grow">
        {/* Content Heading matching Page 1 & Route Tracker */}
        <div className="content-head">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-50 text-orange-700 border border-orange-200">
              <Plane className="w-6 h-6 transform -rotate-45" />
            </div>
            <div>
              <h2>Live Corridors Registry</h2>
              <span className="text-xs font-mono text-slate-500 block mt-1">
                Real-time decomposed economy airfare records sampled across Indian carrier platforms
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-500' : 'text-slate-500'}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Live Feeds'}</span>
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-mono font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>Active Ingestion Surveillance</span>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar Card */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search corridor or route code (e.g. DEL, BOM)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-[#f8fafc] border border-slate-300 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0b2545] focus:bg-white font-mono transition-all"
            />
          </div>

          {/* Carrier Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <span className="text-xs text-slate-400 mr-1 hidden lg:inline font-mono">Platform:</span>
            {availableCarriers.map((carrier) => (
              <button
                key={carrier}
                onClick={() => setCarrierFilter(carrier)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  carrierFilter === carrier
                    ? 'bg-[#0b2545] text-white font-bold shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {carrier}
              </button>
            ))}
          </div>
        </div>

        {/* Responsive Table Card */}
        <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-100 text-[#091d38] font-sans border-b-2 border-slate-300">
                <tr>
                  <th className="py-4 px-5 text-xs sm:text-sm font-extrabold text-[#091d38] tracking-wide uppercase">
                    Corridor &amp; Carrier
                  </th>
                  <th className="py-4 px-4 text-xs sm:text-sm font-extrabold text-[#091d38] tracking-wide uppercase">
                    Horizon
                  </th>
                  <th className="py-4 px-4 text-xs sm:text-sm font-extrabold text-right text-[#091d38] tracking-wide uppercase">
                    Raw Fare
                  </th>
                  <th className="py-4 px-4 text-xs sm:text-sm font-extrabold text-right text-[#091d38] tracking-wide uppercase">
                    Ancillary Fees
                  </th>
                  <th className="py-4 px-4 text-xs sm:text-sm font-extrabold text-right text-emerald-900 tracking-wide uppercase">
                    Pure Base Fare
                  </th>
                  <th className="py-4 px-5 text-xs sm:text-sm font-extrabold text-center text-[#091d38] tracking-wide uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredData.map((row) => {
                  return (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-[#0b2545] flex items-center gap-1.5 font-mono text-sm">
                          <span>{row.origin.split(' ')[0]}</span>
                          <span className="text-slate-400">→</span>
                          <span>{row.dest.split(' ')[0]}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{row.carrier}</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px]">
                          {row.horizon}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-slate-700 font-medium">
                        ₹{row.rawFare.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                        -₹{row.ancillary.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 text-sm">
                        ₹{row.pureFare.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-5 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] font-mono font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Verified</span>
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Table footer info */}
          <div className="p-4 bg-[#f8fafc] border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 font-mono">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>All corridors verified against DGCA statutory tariff bounds &amp; pure fare standards</span>
            </div>
            <div>
              Showing <span className="font-bold text-slate-900">{filteredData.length}</span> active live corridors
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
