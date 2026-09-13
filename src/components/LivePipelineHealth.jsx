import React from 'react'
import { Activity, CheckCircle2, XCircle } from 'lucide-react'

export default function LivePipelineHealth() {
  const pipelines = [
    {
      airline: 'IndiGo (6E)',
      code: '6E',
      type: 'Direct Airline API',
      status: 'Active',
      performance: 99.8,
      speed: '380ms latency',
      statusType: 'active',
    },
    {
      airline: 'Air India (AI)',
      code: 'AI',
      type: 'Direct Airline API',
      status: 'Active',
      performance: 99.4,
      speed: '440ms latency',
      statusType: 'active',
    },
    {
      airline: 'Akasa Air (QP)',
      code: 'QP',
      type: 'Direct Airline API',
      status: 'Active',
      performance: 99.6,
      speed: '390ms latency',
      statusType: 'active',
    },
    {
      airline: 'Alliance Air (9I)',
      code: '9I',
      type: 'Regional UDAN Feeder',
      status: 'Failed',
      performance: 14.2,
      speed: 'Timeout (> 8s)',
      statusType: 'failed',
    },
  ]

  return (
    <section
      id="pipeline-health"
      className="py-16 sm:py-20 relative border-t border-slate-200 overflow-hidden"
    >
      {/* Dark overlay so text stays sharp — background is for feel, not distraction */}
      <div className="absolute inset-0 bg-[#f4f6f9]/92 pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-mono uppercase tracking-wider font-semibold">
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            <span>Surveillance Telemetry</span>
          </div>
          <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold font-heading text-[#0b2545] tracking-tight">
            Live Pipeline Health
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 font-mono">
            Real-time operational status and performance metrics across carrier scrapers
          </p>
        </div>

        {/* Pipeline Health Bars Container */}
        <div className="mt-8 p-6 rounded-2xl bg-white border border-slate-200 shadow-md space-y-5">
          {pipelines.map((item) => {
            const isActive = item.status === 'Active'
            return (
              <div key={item.airline} className="space-y-2 group">
                
                {/* Top Row: Airline Name, Type, Speed, Status Pill */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 font-mono text-sm">
                      {item.airline}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 border border-slate-200 text-slate-700">
                      {item.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 font-mono">
                    <span className="text-[11px] text-slate-500 hidden sm:inline">
                      {item.speed}
                    </span>

                    <span className="font-bold text-slate-900">
                      {item.performance}%
                    </span>

                    {/* Status: Active or Failed */}
                    {isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                        Failed
                      </span>
                    )}
                  </div>
                </div>

                {/* Performance Bar */}
                <div className="w-full h-2.5 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isActive
                        ? 'bg-emerald-600'
                        : 'bg-rose-600'
                    }`}
                    style={{ width: `${item.performance}%` }}
                  ></div>
                </div>

              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-600 px-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              <span>Active: Ingesting Nominal</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
              <span>Failed: Scraper Fault / Timeout</span>
            </span>
          </div>
          <span className="font-semibold text-slate-700">Carrier Surveillance: 3 Active / 1 Failed</span>
        </div>

      </div>
    </section>
  )
}
