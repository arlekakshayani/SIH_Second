import React, { useState } from 'react'
import { Terminal, Menu, X, ArrowRight, Plane, Activity, BarChart3, ShieldCheck } from 'lucide-react'
import logoMark from './assets/logo-mark.png'

export default function Navbar({ currentView, onNavigate }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { id: 'overview', name: 'Home', icon: Plane },
    { id: 'corridors', name: 'Live Corridors', icon: BarChart3 },
    { id: 'radar', name: 'Route Tracker', icon: Activity },
    { id: 'pipeline-health', name: 'Pipeline Health', icon: ShieldCheck },
  ]

  return (
    <nav className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 transition-all shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 sm:h-22">

          {/* 1. Left: Official NAI Logo & Branding */}
          <button
            onClick={() => onNavigate('overview')}
            className="flex items-center gap-3.5 sm:gap-4 group text-left focus:outline-none py-1.5"
            aria-label="National Airfare Index Home"
          >
            <img
              src={logoMark}
              alt="National Airfare Index (NAI) Emblem"
              className="h-12 sm:h-14 md:h-16 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col justify-center leading-[1.04]">
              <span className="text-lg sm:text-xl md:text-[22px] font-black font-heading text-[#0c3c6f] tracking-tight group-hover:text-[#0284c7] transition-colors">
                National
              </span>
              <span className="text-lg sm:text-xl md:text-[22px] font-black font-heading text-[#0c3c6f] tracking-tight group-hover:text-[#0284c7] transition-colors">
                Airfare Index
              </span>
            </div>
          </button>

          {/* 2. Middle: Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-1.5">
            {navItems.map((item) => {
              const isActive =
                currentView === item.id ||
                (item.id === 'radar' && currentView === 'tracker')

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#0b2545] text-white shadow-xs font-extrabold'
                      : 'text-slate-600 hover:text-[#0b2545] hover:bg-slate-100/80'
                  }`}
                >
                  {item.name}
                </button>
              )
            })}
          </div>

          {/* 3. Right: Admin Action Button */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => onNavigate('dashboard')}
              className={`group relative inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-all active:scale-95 shadow-sm border border-amber-500/30 cursor-pointer ${
                currentView === 'dashboard'
                  ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-500 font-extrabold shadow-md'
                  : 'text-slate-950 bg-gradient-to-r from-amber-400 via-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Admin Page</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* 4. Mobile Menu Button */}
          <div className="lg:hidden flex items-center gap-2">
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300"
            >
              Admin
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#061426] hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-5 space-y-1.5 shadow-lg animate-fade-in">
          {navItems.map((item) => {
            const isActive =
              currentView === item.id ||
              (item.id === 'radar' && currentView === 'tracker')

            return (
              <button
                key={item.id}
                onClick={() => {
                  setMobileMenuOpen(false)
                  onNavigate(item.id)
                }}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                  isActive
                    ? 'bg-[#0b2545] text-white shadow-xs font-extrabold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {item.name}
              </button>
            )
          })}

          <div className="pt-2 border-t border-slate-200">
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                onNavigate('dashboard')
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold text-slate-950 bg-amber-400 shadow-sm uppercase tracking-wider"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Admin Page</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
