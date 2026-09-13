import React, { useState, useEffect } from 'react'
import { Activity, ShieldCheck, Clock } from 'lucide-react'

export default function HeaderBanner() {
  const [time, setTime] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTime(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }) + ' IST'
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="w-full bg-gradient-to-r from-[#38bdf8] via-[#2ba8e8] to-[#1e96dc] border-b border-[#2094dc] text-xs py-2 px-4 sm:px-6 relative z-50 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-[#061d38]">
        
        {/* Left: Application Identification */}
        <div className="flex items-center gap-2.5">
          <span className="font-bold text-[#061d38] tracking-wide">
            National Airfare Index
          </span>
          <span className="text-[#061d38]/50">|</span>
          <span className="text-[#032042] font-semibold font-mono text-[11px]">
            Real-Time Tariff Surveillance System
          </span>
        </div>

        {/* Right: Operational Status & System Metric */}
        <div className="flex items-center gap-4 text-[11px]">
          <div className="hidden lg:flex items-center gap-1.5 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono text-white font-medium">{time || '03:30:00 PM IST'}</span>
          </div>

          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-medium tracking-wide">
              14 Scraping Engines Operational
            </span>
          </div>
        </div>

      </div>
    </header>
  )
}
