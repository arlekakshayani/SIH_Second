import React, { useEffect, useState } from 'react'

export default function FlightLoader({ onDone }) {
  const [progress, setProgress] = useState(0)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    let val = 0
    const interval = setInterval(() => {
      val += Math.random() * 2.5 + 1
      if (val >= 100) {
        val = 100
        clearInterval(interval)
        setTimeout(() => setFadeOut(true), 500)
        setTimeout(() => onDone(), 1100)
      }
      setProgress(Math.min(val, 100))
    }, 55)
    return () => clearInterval(interval)
  }, [onDone])

  // Plane travels along a curved arc from bottom-left to top-right
  // SVG viewBox 0 0 600 200, path goes from (20,170) to (580,30)
  const pathD = 'M 20 170 Q 300 60 580 30'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        transition: 'opacity 0.7s ease',
        opacity: fadeOut ? 0 : 1,
        pointerEvents: fadeOut ? 'none' : 'all',
      }}
    >
      {/* ── Tricolor top ribbon ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 5,
        background: 'linear-gradient(to right, #FF9933 33.3%, #ffffff 33.3%, #ffffff 66.6%, #138808 66.6%)',
        borderBottom: '1px solid #e2e8f0',
      }} />

      {/* ── Main card ── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0,
        width: '100%',
        maxWidth: 520,
        padding: '0 24px',
      }}>

        {/* Government Emblem placeholder + App identity */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          {/* Ashoka Wheel SVG */}
          <AshokaWheel />
          <p style={{
            fontFamily: 'Georgia, serif',
            fontSize: 11,
            color: '#1e3a5f',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginTop: 2,
            fontWeight: 600,
          }}>
            Government of India
          </p>
          <p style={{
            fontFamily: 'Georgia, serif',
            fontSize: 10,
            color: '#4b6584',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            Ministry of Civil Aviation
          </p>
        </div>

        {/* Divider */}
        <div style={{ width: 180, height: 1, background: 'linear-gradient(to right,transparent,#c8d6e5,transparent)', margin: '8px 0 16px' }} />

        {/* App Name */}
        <h1 style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 22,
          fontWeight: 800,
          color: '#0f2c54',
          letterSpacing: '-0.01em',
          marginBottom: 2,
          textAlign: 'center',
        }}>
          National <span style={{ color: '#c47f00' }}>Airfare Index</span>
        </h1>
        <p style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 11,
          color: '#64748b',
          letterSpacing: '0.05em',
          marginBottom: 20,
          textAlign: 'center',
        }}>
          Real-Time Tariff Surveillance System
        </p>

        {/* ── Flight Path Animation ── */}
        <div style={{ width: '100%', position: 'relative', height: 120 }}>
          <svg
            viewBox="0 0 600 200"
            width="100%"
            height="100%"
            style={{ overflow: 'visible' }}
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Dashed flight path */}
            <path
              d={pathD}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="1.5"
              strokeDasharray="8 6"
            />

            {/* Airport dots – departure & arrival */}
            <circle cx="20" cy="170" r="5" fill="#138808" />
            <circle cx="580" cy="30" r="5" fill="#FF9933" />

            {/* Labels */}
            <text x="28" y="182" fontSize="10" fill="#64748b" fontFamily="Inter,sans-serif">DEP</text>
            <text x="548" y="24" fontSize="10" fill="#64748b" fontFamily="Inter,sans-serif">ARR</text>

            {/* Animated plane along the path */}
            <g>
              <animateMotion
                dur="2.6s"
                repeatCount="indefinite"
                rotate="auto"
                keyTimes="0;1"
                keyPoints="0;1"
                calcMode="spline"
                keySplines="0.42 0 0.58 1"
              >
                <mpath href="#flightPath" />
              </animateMotion>

              {/* Neat plane SVG — side profile, pointing right */}
              <PlaneSVG />
            </g>

            {/* Hidden path for animateMotion mpath reference */}
            <defs>
              <path id="flightPath" d={pathD} />
            </defs>
          </svg>
        </div>

        {/* ── Progress bar ── */}
        <div style={{ width: '100%', marginTop: 4 }}>
          <div style={{
            width: '100%',
            height: 4,
            borderRadius: 9999,
            background: '#e2e8f0',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              transition: 'width 0.1s linear',
              background: 'linear-gradient(to right, #1e3a8a, #0284c7, #f59e0b)',
              borderRadius: 9999,
            }} />
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 6,
            fontFamily: "'Inter', monospace",
            fontSize: 10,
            color: '#94a3b8',
          }}>
            <span>Loading systems…</span>
            <span style={{ fontWeight: 600, color: '#64748b' }}>{Math.round(progress)}%</span>
          </div>
        </div>

      </div>

      {/* ── Bottom tricolor ribbon ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 4,
        background: 'linear-gradient(to right, #FF9933 33.3%, #ffffff 33.3%, #ffffff 66.6%, #138808 66.6%)',
        borderTop: '1px solid #e2e8f0',
      }} />
    </div>
  )
}

/* ── Neat plane SVG (side view, pointing right) ── */
function PlaneSVG() {
  return (
    <g transform="translate(-18, -10)" filter="drop-shadow(0 2px 6px rgba(2,132,199,0.35))">
      {/* Fuselage */}
      <ellipse cx="18" cy="10" rx="16" ry="4.5" fill="#0f2c54" />
      {/* Nose cone */}
      <path d="M34 10 Q42 10 38 8 L34 10Z" fill="#1e3a8a" />
      {/* Cockpit window */}
      <ellipse cx="30" cy="8.5" rx="3" ry="2" fill="#7dd3fc" />
      {/* Main wings */}
      <path d="M20 10 L10 2 L6 4 L18 12Z" fill="#1e40af" />
      <path d="M20 10 L10 18 L6 16 L18 8Z" fill="#1e40af" fillOpacity="0.7" />
      {/* Tail fin */}
      <path d="M4 10 L0 5 L3 4.5 L6 10Z" fill="#1e3a8a" />
      <path d="M4 10 L0 14 L3 14.5 L6 10Z" fill="#1e3a8a" fillOpacity="0.6" />
      {/* Engine pod */}
      <ellipse cx="15" cy="5" rx="3.5" ry="1.8" fill="#334155" />
      <circle cx="11.5" cy="5" r="1.5" fill="#7dd3fc" fillOpacity="0.6" />
    </g>
  )
}

/* ── Ashoka Chakra (24-spoke wheel) ── */
function AshokaWheel() {
  const spokes = Array.from({ length: 24 }, (_, i) => {
    const angle = (i * 360) / 24
    const rad = (angle * Math.PI) / 180
    const cx = 30, cy = 30, r1 = 8, r2 = 26
    return {
      x1: cx + r1 * Math.cos(rad),
      y1: cy + r1 * Math.sin(rad),
      x2: cx + r2 * Math.cos(rad),
      y2: cy + r2 * Math.sin(rad),
    }
  })

  return (
    <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
      {/* Outer ring */}
      <circle cx="30" cy="30" r="27" fill="none" stroke="#1e3a8a" strokeWidth="2.5" />
      {/* Inner hub */}
      <circle cx="30" cy="30" r="7" fill="none" stroke="#1e3a8a" strokeWidth="2" />
      <circle cx="30" cy="30" r="3.5" fill="#1e3a8a" />
      {/* 24 Spokes */}
      {spokes.map((s, i) => (
        <line
          key={i}
          x1={s.x1} y1={s.y1}
          x2={s.x2} y2={s.y2}
          stroke="#1e3a8a"
          strokeWidth="1"
        />
      ))}
    </svg>
  )
}
