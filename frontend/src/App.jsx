import React, { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import HeroSection from './components/HeroSection'
import LivePipelineHealth from './components/LivePipelineHealth'
import LiveDemoTable from './components/LiveDemoTable'
import Dashboard from './components/Dashboard'
import RouteAnalytics from './components/RouteAnalytics'
import Footer from './components/Footer'
import PdfCalculationModal from './components/PdfCalculationModal'

export default function App() {
  // 'overview' | 'pipeline-health' | 'corridors' | 'radar' | 'dashboard'
  const [currentView, setCurrentView] = useState('overview')
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [pdfModalInitialRoute, setPdfModalInitialRoute] = useState('BLR-BOM')

  // Handler to open MoSPI PDF 4-step methodology modal
  const handleOpenPdfModal = (route = 'BLR-BOM') => {
    setPdfModalInitialRoute(route || 'BLR-BOM')
    setIsPdfModalOpen(true)
  }

  // Listen to hash changes for deep linking (#overview, #pipeline-health, #corridors, #radar, #dashboard, #admin, #methodology)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '')
      if (hash === 'methodology') {
        setIsPdfModalOpen(true)
        return
      }
      if (['overview', 'pipeline-health', 'corridors', 'radar', 'tracker', 'dashboard', 'admin'].includes(hash)) {
        if (hash === 'admin') setCurrentView('dashboard')
        else if (hash === 'tracker') setCurrentView('radar')
        else setCurrentView(hash)
      }
    }

    const initialHash = window.location.hash.replace('#', '')
    if (initialHash === 'methodology') {
      setIsPdfModalOpen(true)
      setCurrentView('overview')
    } else if (['overview', 'pipeline-health', 'corridors', 'radar', 'tracker', 'dashboard', 'admin'].includes(initialHash)) {
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
    if (view === 'methodology') {
      setIsPdfModalOpen(true)
      return
    }
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
        onOpenMethodology={() => handleOpenPdfModal('BLR-BOM')}
      />

      {/* Main Content: Discrete View Panels */}
      <main className="flex-grow">
        {currentView === 'overview' && (
          <HeroSection
            onNavigate={handleNavigate}
            onOpenMethodology={handleOpenPdfModal}
          />
        )}

        {currentView === 'pipeline-health' && (
          <LivePipelineHealth onBackToLanding={() => handleNavigate('overview')} onOpenMethodology={handleOpenPdfModal} />
        )}

        {currentView === 'corridors' && (
          <LiveDemoTable onBackToLanding={() => handleNavigate('overview')} onOpenMethodology={handleOpenPdfModal} />
        )}

        {currentView === 'radar' && (
          <RouteAnalytics
            onBackToLanding={() => handleNavigate('overview')}
            onGoToDashboard={() => handleNavigate('dashboard')}
            onOpenMethodology={handleOpenPdfModal}
          />
        )}

        {currentView === 'dashboard' && (
          <Dashboard
            onBackToLanding={() => handleNavigate('overview')}
            onGoToRouteAnalytics={() => handleNavigate('radar')}
            onOpenMethodology={handleOpenPdfModal}
          />
        )}
      </main>

      {/* Official Project & MoSPI Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* MoSPI Econometric Methodology 4-Step Engine Modal */}
      <PdfCalculationModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        initialRoute={pdfModalInitialRoute}
      />

    </div>
  )
}

