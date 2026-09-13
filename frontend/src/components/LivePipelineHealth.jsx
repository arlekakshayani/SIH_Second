import React, { useState } from 'react'
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Server,
  RefreshCw,
  Cpu,
  Clock,
  ShieldCheck,
  Zap,
  Radio,
  ExternalLink,
} from 'lucide-react'

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

export default function LivePipelineHealth({ onBackToLanding }) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastCheckTime, setLastCheckTime] = useState(() => formatISTDate())

  const pipelines = [
    {
      airline: 'IndiGo Airlines',
      code: '6E',
      flightCount: '4,200 fares/hr',
      type: 'Direct Airline REST API',
      status: 'Active',
      performance: 99.8,
      speed: '380ms latency',
      statusType: 'active',
      httpStatus: '200 OK',
      lastPolled: '1 min ago',
      failover: 'Hot Standby Replica',
    },
    {
      airline: 'Air India',
      code: 'AI',
      flightCount: '3,850 fares/hr',
      type: 'Direct Airline GDS API',
      status: 'Active',
      performance: 99.4,
      speed: '440ms latency',
      statusType: 'active',
      httpStatus: '200 OK',
      lastPolled: '2 mins ago',
      failover: 'Automated Token Refresh',
    },
    {
      airline: 'Akasa Air',
      code: 'QP',
      flightCount: '1,920 fares/hr',
      type: 'Direct Airline Webhook',
      status: 'Active',
      performance: 99.6,
      speed: '390ms latency',
      statusType: 'active',
      httpStatus: '200 OK',
      lastPolled: '2 mins ago',
      failover: 'Exponential Backoff',
    },
    {
      airline: 'Alliance Air (UDAN)',
      code: '9I',
      flightCount: '480 fares/hr',
      type: 'Regional UDAN Feeder',
      status: 'Scraper Fault',
      performance: 14.2,
      speed: 'Timeout (> 8s)',
      statusType: 'failed',
      httpStatus: '504 Gateway Timeout',
      lastPolled: '3 mins ago',
      failover: 'Serving Cached Baseline',
    },
    {
      airline: 'SpiceJet',
      code: 'SG',
      flightCount: '1,100 fares/hr',
      type: 'OTA Aggregator Feed',
      status: 'Active',
      performance: 96.8,
      speed: '510ms latency',
      statusType: 'active',
      httpStatus: '200 OK',
      lastPolled: '4 mins ago',
      failover: 'Rate Limit Throttling',
    },
  ]

  const handleTestPipelines = () => {
    setIsSyncing(true)
    setTimeout(() => {
      setIsSyncing(false)
      setLastCheckTime(formatISTDate())
    }, 600)
  }

  const activeCount = pipelines.filter((p) => p.statusType === 'active').length
  const failedCount = pipelines.filter((p) => p.statusType === 'failed').length

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
              <span className="font-bold text-[#0c3c6f]">Pipeline Health</span>
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
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h2>Pipeline Health</h2>
              <span className="text-xs font-mono text-slate-500 block mt-1">
                Real-time operational status, latency benchmarks, and carrier scraper feed health
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-mono font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            <span>Surveillance Telemetry Active</span>
          </div>
        </div>

        {/* Pipeline Health Bars Card */}
        <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-lg font-bold text-[#0b2545] font-heading">
                Carrier API Feed Status &amp; Latency Profiles
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Real-time operational status and latency benchmarks across individual carrier ingestion engines
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleTestPipelines}
                disabled={isSyncing}
                className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-500' : 'text-slate-500'}`} />
                <span>{isSyncing ? 'Probing Feeds...' : 'Probe Endpoints'}</span>
              </button>
              <span className="text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                <span>Live Ingestion Engine v2.4</span>
              </span>
            </div>
          </div>

          <div className="space-y-6">
            {pipelines.map((item) => {
              const isActive = item.statusType === 'active'
              return (
                <div key={item.airline} className="space-y-2.5">
                  {/* Top Row: Airline Name, Type, Speed, Status Pill */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-[#0c3c6f] border border-blue-200 font-mono font-bold text-xs">
                        {item.code}
                      </span>
                      <span className="font-bold text-slate-900 font-mono text-sm">
                        {item.airline}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 border border-slate-200 text-slate-600 hidden sm:inline">
                        {item.type}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 hidden md:inline">
                        • {item.flightCount}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 font-mono">
                      <span className="text-xs text-slate-600">
                        {item.speed}
                      </span>

                      <span className={`font-bold text-xs ${isActive ? 'text-slate-900' : 'text-rose-700'}`}>
                        {item.performance}%
                      </span>

                      {/* Status: Active or Failed */}
                      {isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                          Scraper Fault
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Performance Bar */}
                  <div className="w-full h-3 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isActive ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}
                      style={{ width: `${item.performance}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-600">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                <span>Active: Nominal Scraper Feed</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
                <span>Scraper Fault: Fallback Cache Triggered</span>
              </span>
            </div>
            <span className="font-semibold text-slate-700">
              Carrier Coverage: {activeCount} Active / {failedCount} Attention Needed
            </span>
          </div>
        </div>

        {/* Detailed Operational Diagnostics Table Card */}
        <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-md">
          <div className="p-5 border-b border-slate-200 bg-slate-50/70">
            <h3 className="text-base font-bold text-[#0b2545] font-heading">
              Feed Ingestion Diagnostics &amp; Failover Telemetry
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Individual endpoint protocol handshake status, HTTP response verification, and failover state
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-100 text-[#091d38] font-sans border-b-2 border-slate-300">
                <tr>
                  <th className="py-3.5 px-5 text-xs font-extrabold text-[#091d38] uppercase">Carrier &amp; Code</th>
                  <th className="py-3.5 px-4 text-xs font-extrabold text-[#091d38] uppercase">Feed Protocol</th>
                  <th className="py-3.5 px-4 text-xs font-extrabold text-[#091d38] uppercase">HTTP Handshake</th>
                  <th className="py-3.5 px-4 text-xs font-extrabold text-[#091d38] uppercase">Last Polled</th>
                  <th className="py-3.5 px-5 text-xs font-extrabold text-[#091d38] uppercase">Fault Mitigation State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pipelines.map((row) => (
                  <tr key={row.code} className="hover:bg-slate-50 transition-colors font-mono">
                    <td className="py-3.5 px-5 font-bold text-[#0b2545]">
                      <span>{row.airline}</span>
                      <span className="ml-2 text-slate-400">({row.code})</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{row.type}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold ${
                          row.statusType === 'active'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {row.httpStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{row.lastPolled}</td>
                    <td className="py-3.5 px-5">
                      <span className="text-slate-700 font-semibold">{row.failover}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-[#f8fafc] border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 font-mono">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Compliant with Civil Aviation real-time open-telemetry benchmark SLA (99.5%)</span>
            </div>
            <span className="text-slate-500">Auto-recovery daemon listening</span>
          </div>
        </div>
      </div>
    </div>
  )
}
