import React, { useEffect, useState, useRef } from 'react'
import flightSymbol from './assets/whatsappimage.png'
import logoMark from './assets/logo-mark.png'

export default function FlightLoader({ onDone }) {
  // 'loading' (0-100% rotating flight symbol) -> 'zoom' (NAI logo zooms in small to big) -> 'fly' (moves to navbar) -> 'done'
  const [phase, setPhase] = useState('loading')
  const [progress, setProgress] = useState(0)
  const [isZoomExpanded, setIsZoomExpanded] = useState(false)
  const [targetRect, setTargetRect] = useState(null)
  const [screenDim, setScreenDim] = useState({
    w: typeof window !== 'undefined' ? window.innerWidth : 1200,
    h: typeof window !== 'undefined' ? window.innerHeight : 800,
  })

  // Measure screen dimensions
  useEffect(() => {
    const updateDims = () => {
      setScreenDim({ w: window.innerWidth, h: window.innerHeight })
    }
    window.addEventListener('resize', updateDims)
    return () => window.removeEventListener('resize', updateDims)
  }, [])

  // Hide the navbar logo while loader animation is in progress to prevent duplicate display
  useEffect(() => {
    const navLogo = document.getElementById('navbar-logo')
    if (navLogo) {
      navLogo.style.opacity = '0'
    }
  }, [])

  // 1. Progress from 0% to 100% with clockwise rotating flight symbol
  useEffect(() => {
    let current = 0
    const intervalTime = 30 // ~2.2 seconds total
    const timer = setInterval(() => {
      current += Math.random() * 2.2 + 1.2
      if (current >= 100) {
        current = 100
        setProgress(100)
        clearInterval(timer)

        // Hold at 100% briefly, then advance to Zoom phase
        setTimeout(() => {
          setPhase('zoom')
        }, 320)
      } else {
        setProgress(Math.min(100, Math.round(current)))
      }
    }, intervalTime)

    return () => clearInterval(timer)
  }, [])

  // 2. Zoom-in effect (small to big) & Flight transition to navbar
  useEffect(() => {
    if (phase === 'zoom') {
      // Find the Navbar logo's coordinates on the page
      const navEl = document.getElementById('navbar-logo')
      if (navEl) {
        const rect = navEl.getBoundingClientRect()
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width || 76,
          height: rect.height || 56,
        })
      } else {
        // Fallback Navbar logo coordinates
        setTargetRect({
          top: 18,
          left: Math.max(16, (window.innerWidth - 1280) / 2 + 24),
          width: 76,
          height: 56,
        })
      }

      // Trigger zoom-in animation (small -> big) right after render
      const zoomTimer = setTimeout(() => {
        setIsZoomExpanded(true)
      }, 50)

      // Hold opened logo in center, then initiate flight to navbar position
      const flyTimer = setTimeout(() => {
        setPhase('fly')
      }, 1100)

      return () => {
        clearTimeout(zoomTimer)
        clearTimeout(flyTimer)
      }
    }

    if (phase === 'fly') {
      // Allow 850ms for smooth glide into navbar
      const doneTimer = setTimeout(() => {
        const navLogo = document.getElementById('navbar-logo')
        if (navLogo) {
          navLogo.style.opacity = '1'
        }
        setPhase('done')
        if (onDone) onDone()
      }, 880)

      return () => clearTimeout(doneTimer)
    }
  }, [phase, onDone])

  if (phase === 'done') return null

  // Center coordinates for the zoomed NAI logo
  const centerLogoW = Math.min(320, screenDim.w * 0.72)
  const centerLogoH = centerLogoW * (271 / 392)
  const centerX = screenDim.w / 2 - centerLogoW / 2
  const centerY = screenDim.h / 2 - centerLogoH / 2 - 20

  // Calculate dynamic style for the NAI logo
  let logoStyle = {
    position: 'fixed',
    zIndex: 10002,
    pointerEvents: 'none',
  }

  if (phase === 'fly' && targetRect) {
    logoStyle = {
      ...logoStyle,
      top: `${targetRect.top}px`,
      left: `${targetRect.left}px`,
      width: `${targetRect.width}px`,
      height: `${targetRect.height}px`,
      transform: 'scale(1)',
      opacity: 1,
      transition: 'all 0.85s cubic-bezier(0.2, 1, 0.35, 1)',
    }
  } else if (phase === 'zoom') {
    logoStyle = {
      ...logoStyle,
      top: `${centerY}px`,
      left: `${centerX}px`,
      width: `${centerLogoW}px`,
      height: `${centerLogoH}px`,
      transform: isZoomExpanded ? 'scale(1.18)' : 'scale(0.12)',
      opacity: isZoomExpanded ? 1 : 0,
      transition: 'transform 0.75s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease-out',
    }
  } else {
    logoStyle = {
      ...logoStyle,
      top: `${centerY}px`,
      left: `${centerX}px`,
      width: `${centerLogoW}px`,
      height: `${centerLogoH}px`,
      transform: 'scale(0.1)',
      opacity: 0,
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[10000] flex flex-col items-center justify-center select-none ${
        phase === 'fly' ? 'pointer-events-none' : 'pointer-events-auto'
      }`}
      style={{
        backgroundColor: '#f4f6f9',
        opacity: phase === 'fly' ? 0 : 1,
        transition: phase === 'fly' ? 'opacity 0.75s ease-in-out' : 'none',
      }}
    >
      {/* ── Top Subtle Brand Gradient Accent Bar ── */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 via-amber-400 to-[#0b2545]" />

      {/* ── PHASE 1: Flight Loading Symbol & 100% Clockwise Rotation ── */}
      {phase === 'loading' && (
        <div className="flex flex-col items-center justify-center gap-6 animate-loader-fade">
          
          {/* Rotating Flight Symbol Container */}
          <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center">
            {/* Soft Ambient Cyan/Blue Glow Ring */}
            <div className="absolute inset-0 rounded-full bg-sky-400/20 blur-2xl animate-pulse" />

            {/* Circular Flight Symbol Rotating in Clockwise Direction */}
            <div
              className="w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden shadow-2xl border-4 border-white bg-[#3299db] flex items-center justify-center"
              style={{
                animation: 'spinClockwise 1.5s linear infinite',
              }}
            >
              <img
                src={flightSymbol}
                alt="Flight Loading Symbol"
                className="w-full h-full object-cover pointer-events-none"
              />
            </div>

            {/* Central Compass Pivot Dot */}
            <div className="absolute w-4 h-4 rounded-full bg-white shadow-lg border-2 border-sky-600" />
          </div>

          {/* Progress Percentage & Status Bar */}
          <div className="flex flex-col items-center gap-2.5 max-w-xs w-full px-4">
            <div className="flex items-center justify-between w-full text-xs font-mono">
              <span className="text-slate-500 uppercase tracking-wider font-semibold">
                Loading Airfare Telemetry
              </span>
              <span className="text-[#0b2545] font-black text-sm font-mono">
                {progress}%
              </span>
            </div>

            {/* Track & Filled Progress Bar */}
            <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden shadow-inner p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 via-sky-600 to-[#0b2545] transition-all duration-75 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="text-[11px] font-mono text-slate-500 text-center mt-1">
              {progress < 40
                ? 'Ingesting 142 National Route Corridors...'
                : progress < 85
                ? 'Decomposing Carrier & OTA Fare Baselines...'
                : 'Finalizing National Airfare Index...'}
            </p>
          </div>
        </div>
      )}


      {/* ── PHASE 2 & 3: Animated NAI Logo (Zoom In -> Glide to Navbar) ── */}
      {(phase === 'zoom' || phase === 'fly') && (
        <img
          src={logoMark}
          alt="National Airfare Index (NAI) Logo"
          style={logoStyle}
          className="object-contain drop-shadow-xl select-none"
        />
      )}

      {/* Embedded Animation Styles */}
      <style>{`
        @keyframes spinClockwise {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes loaderFade {
          from {
            opacity: 0;
            transform: scale(0.92);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-loader-fade {
          animation: loaderFade 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
