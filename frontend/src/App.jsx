import React, { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import HeroSection from './components/HeroSection'
import LivePipelineHealth from './components/LivePipelineHealth'
import LiveDemoTable from './components/LiveDemoTable'
import Dashboard from './components/Dashboard'
import RouteAnalytics from './components/RouteAnalytics'
import Footer from './components/Footer'

export default function App() {
  // 'overview' | 'pipeline-health' | 'corridors' | 'radar' | 'dashboard'
  const [currentView, setCurrentView] = useState('overview')

  // Listen to hash changes for deep linking (#overview, #pipeline-health, #corridors, #radar, #dashboard, #admin)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '')
      if (['overview', 'pipeline-health', 'corridors', 'radar', 'tracker', 'dashboard', 'admin'].includes(hash)) {
        if (hash === 'admin') setCurrentView('dashboard')
        else if (hash === 'tracker') setCurrentView('radar')
        else setCurrentView(hash)
      }
    }

    const initialHash = window.location.hash.replace('#', '')
    if (['overview', 'pipeline-health', 'corridors', 'radar', 'tracker', 'dashboard', 'admin'].includes(initialHash)) {
      if (initialHash === 'admin') setCurrentView('dashboard')
      else if (initialHash === 'tracker') setCurrentView('radar')
      else setCurrentView(initialHash)
    } else {
      setCurrentView('overview')
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Navigation handler: directly switches active view
  const handleNavigate = (view) => {
    window.location.hash = `#${view}`
    setCurrentView(view === 'admin' ? 'dashboard' : view)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-slate-800 flex flex-col font-sans selection:bg-amber-500 selection:text-white">
      
      {/* Top Navigation Bar */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
      />

      {/* Main Content: Discrete View Panels */}
      <main className="flex-grow">
        {currentView === 'overview' && (
          <HeroSection onNavigate={handleNavigate} />
        )}

        {currentView === 'pipeline-health' && (
          <LivePipelineHealth onBackToLanding={() => handleNavigate('overview')} />
        )}

        {currentView === 'corridors' && (
          <LiveDemoTable onBackToLanding={() => handleNavigate('overview')} />
        )}

        {currentView === 'radar' && (
          <RouteAnalytics
            onBackToLanding={() => handleNavigate('overview')}
            onGoToDashboard={() => handleNavigate('dashboard')}
          />
        )}

        {currentView === 'dashboard' && (
          <Dashboard
            onBackToLanding={() => handleNavigate('overview')}
            onGoToRouteAnalytics={() => handleNavigate('radar')}
          />
        )}
      </main>

      {/* Official Project & MoSPI Footer */}
      <Footer onNavigate={handleNavigate} />

    </div>
  )
}
