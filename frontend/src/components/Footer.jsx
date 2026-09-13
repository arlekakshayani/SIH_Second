import React from 'react'
import logoMark from './assets/logo-mark.png'

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-slate-300 text-slate-700 font-sans mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-7">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Left: Official Emblem & Ministry Branding */}
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <img
              src={logoMark}
              alt="National Airfare Index Logo"
              className="h-10 sm:h-12 w-auto object-contain shrink-0"
            />
            <div className="flex flex-col justify-center leading-tight">
              <span className="text-base sm:text-lg font-black font-heading text-[#0c3c6f] tracking-tight">
                National Airfare Index (NAI)
              </span>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Ministry of Statistics &amp; Programme Implementation (MoSPI), Government of India
              </p>
            </div>
          </div>

          {/* Right: Clean Copyright & Official Notice */}
          <div className="text-center sm:text-right text-xs font-mono text-slate-500 space-y-0.5">
            <p className="font-semibold text-slate-700">© 2026 Government of India</p>
            <p className="text-[11px] text-slate-400">
              Official Civil Aviation Airfare Price Index &amp; Tariff Surveillance System
            </p>
          </div>

        </div>
      </div>
    </footer>
  )
}
