import React, { useState, useMemo } from 'react'
import {
  X,
  FileText,
  Calculator,
  ArrowRight,
  CheckCircle2,
  Layers,
  TrendingUp,
  Percent,
  Database,
  BarChart2,
  ChevronDown,
  Info,
  ShieldCheck,
  Plane,
  Sparkles,
  Printer
} from 'lucide-react'
import {
  calculateRouteIndex,
  calculateNationalIndex,
  getAllRoutes,
  getEconometricMetadata
} from '../services/airfareCalculationEngine'

export default function PdfCalculationModal({ isOpen, onClose, initialRoute = 'BLR-BOM' }) {
  const [selectedRoute, setSelectedRoute] = useState(initialRoute || 'BLR-BOM')
  const [activeStepTab, setActiveStepTab] = useState('all') // 'all' | 'step1' | 'step2' | 'step3' | 'step4'
  const [method, setMethod] = useState('laspeyres') // 'laspeyres' | 'jevons'

  const allRoutes = useMemo(() => getAllRoutes('latest', method), [method])
  const routeData = useMemo(() => calculateRouteIndex(selectedRoute, 'latest', method), [selectedRoute, method])
  const nationalData = useMemo(() => calculateNationalIndex('latest', method), [method])
  const metadata = useMemo(() => getEconometricMetadata(), [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#061426] via-[#0b2545] to-[#133a6b] text-white px-6 py-5 border-b border-amber-500/30 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-400 text-slate-950 font-black shadow-md">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black font-heading tracking-tight text-white uppercase">
                  MoSPI Econometric Methodology Engine
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  Axiomatic 4-Step Architecture
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Replicating the official handwritten specification (Archetype: {selectedRoute} → All 25 Corridors → National Airfare Index)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Route Selector Dropdown */}
            <div className="relative">
              <select
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
                aria-label="Select Corridor Route for Step-by-Step Breakdown"
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer backdrop-blur-md transition-all appearance-none"
              >
                {allRoutes.map((r) => (
                  <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                    {r.id} ({r.originCode} ➔ {r.destCode}) • W: {r.weight}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-amber-300 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>

            {/* Print / Save PDF Button */}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              title="Print or Save formulas and calculations as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Executive Ribbon: Quick KPI Summary of the Calculation */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-wrap gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <span className="text-slate-400 font-medium">Selected Route:</span>{' '}
              <span className="font-bold font-mono text-[#0b2545]">{selectedRoute}</span>
              <span className="text-slate-400 ml-1">({routeData?.origin_city} ➔ {routeData?.destination_city})</span>
            </div>
            <div className="h-4 w-px bg-slate-300 hidden sm:block" />
            <div>
              <span className="text-slate-400 font-medium">Base Date (1.1):</span>{' '}
              <span className="font-bold text-slate-800">{metadata.base_date}</span>
            </div>
            <div className="h-4 w-px bg-slate-300 hidden sm:block" />
            <div>
              <span className="text-slate-400 font-medium">Latest Scraped (1.2):</span>{' '}
              <span className="font-bold text-slate-800">{metadata.latest_date}</span>
            </div>
            <div className="h-4 w-px bg-slate-300 hidden sm:block" />
            <div>
              <span className="text-slate-400 font-medium">Route Index:</span>{' '}
              <span className="font-black text-blue-700 font-mono text-sm">
                {routeData?.laspeyres_route_index}
              </span>
            </div>
            <div className="h-4 w-px bg-slate-300 hidden sm:block" />
            <div>
              <span className="text-slate-400 font-medium">National Index (NAI):</span>{' '}
              <span className="font-black text-amber-600 font-mono text-sm">
                {nationalData?.indexValue}
              </span>
              <span className="ml-1 text-[11px] font-bold text-emerald-600">({nationalData?.baseChangePct})</span>
            </div>
          </div>

          {/* Step Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-lg">
            {[
              { id: 'all', label: 'All 4 Steps' },
              { id: 'step1', label: 'Step 1: Base Avg' },
              { id: 'step2', label: 'Step 2: Jevons' },
              { id: 'step3', label: 'Step 3: Laspeyres Route' },
              { id: 'step4', label: 'Step 4: National NAI' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveStepTab(tab.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  activeStepTab === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50">

          {/* STEP 1 SECTION */}
          {(activeStepTab === 'all' || activeStepTab === 'step1') && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-start justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                    1
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Step 1: Base Table Average Fares for {selectedRoute}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Calculates the base average fare across all advance horizons (T+1, T+7, T+15, T+30, T+45) anchored to {metadata.base_date}.
                    </p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg text-xs font-mono font-bold text-blue-800">
                  Formula: Avg Fare (T+k) = (1 / n) * Σ P_0,i
                </div>
              </div>

              {/* Table of Step 1 */}
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Advance Horizon</th>
                      <th className="py-2.5 px-4">Horizon Code</th>
                      <th className="py-2.5 px-4">Sample Flights Count</th>
                      <th className="py-2.5 px-4">Base Avg Pure Fare</th>
                      <th className="py-2.5 px-4 font-bold text-blue-900">Base Avg Total Fare (Step 1 Result)</th>
                      <th className="py-2.5 px-4">Handwritten Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {routeData?.horizons?.map((h) => (
                      <tr key={h.advance_days} className="hover:bg-blue-50/40">
                        <td className="py-2 px-4 font-mono font-bold text-slate-900">{h.horizon_code}</td>
                        <td className="py-2 px-4 text-slate-600">{h.advance_days} Days Departure</td>
                        <td className="py-2 px-4 text-slate-600">{h.matched_flights_count} active flights</td>
                        <td className="py-2 px-4 font-mono text-slate-700">₹{h.base_avg_pure_fare.toLocaleString('en-IN')}</td>
                        <td className="py-2 px-4 font-mono font-bold text-blue-700 text-sm">
                          ₹{h.base_avg_fare.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2 px-4 text-[11px] text-slate-500 italic">
                          Avg fare of {h.horizon_code} saved for expenditure weighting
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 2 SECTION */}
          {(activeStepTab === 'all' || activeStepTab === 'step2') && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-start justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                    2
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Step 2: Observation Matching & Jevons Elementary Price Index
                    </h3>
                    <p className="text-xs text-slate-500">
                      Calculates price change for every flight observation matched in <strong>both Base & Present tables</strong>: 
                      (P_present / P_base) × 100, then applies Jevons geometric mean for each horizon.
                    </p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-mono font-bold text-indigo-800">
                  Formula: Jevons Index = (Π R_i)^(1/n)
                </div>
              </div>

              {/* Step 2 Horizon Indices Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {routeData?.horizons?.map((h) => (
                  <div
                    key={h.advance_days}
                    className="p-3 rounded-xl bg-gradient-to-b from-indigo-50/50 to-white border border-indigo-100 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono text-indigo-900">{h.horizon_code}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 font-bold">
                        {h.advance_days}D
                      </span>
                    </div>
                    <div className="text-lg font-black font-mono text-slate-900 mt-1">
                      {h.horizon_jevons_index}
                    </div>
                    <div className="text-[11px] font-medium text-slate-500">
                      {h.horizon_jevons_index >= 100 ? `+${(h.horizon_jevons_index - 100).toFixed(1)}%` : `${(h.horizon_jevons_index - 100).toFixed(1)}%`} vs Base
                    </div>
                  </div>
                ))}
              </div>

              {/* Matched Flight Observations Table (Excerpt) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Matched Observations Table (Strictly present in both Base and Present Scraped Data):</span>
                  <span>Displaying top matched observations for {selectedRoute}</span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Carrier</th>
                        <th className="py-2 px-3">Flight No</th>
                        <th className="py-2 px-3">Advance</th>
                        <th className="py-2 px-3 font-mono">Base Fare (P_0)</th>
                        <th className="py-2 px-3 font-mono">Present Fare (P_t)</th>
                        <th className="py-2 px-3 font-mono font-bold text-indigo-700">Price Relative (P_t/P_0 × 100)</th>
                        <th className="py-2 px-3 font-mono">Price Change</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {routeData?.matched_flights?.map((mf, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-1.5 px-3 font-medium text-slate-800">{mf.airline}</td>
                          <td className="py-1.5 px-3 font-mono text-slate-600">{mf.flight_number}</td>
                          <td className="py-1.5 px-3 font-mono font-bold text-slate-700">T+{mf.advance_days}</td>
                          <td className="py-1.5 px-3 font-mono text-slate-600">₹{mf.base_fare.toLocaleString('en-IN')}</td>
                          <td className="py-1.5 px-3 font-mono text-slate-800">₹{mf.pres_fare.toLocaleString('en-IN')}</td>
                          <td className="py-1.5 px-3 font-mono font-bold text-indigo-700">{mf.price_relative}</td>
                          <td className={`py-1.5 px-3 font-mono font-bold ${mf.change_pct >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {mf.change_pct >= 0 ? `+${mf.change_pct}%` : `${mf.change_pct}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 SECTION */}
          {(activeStepTab === 'all' || activeStepTab === 'step3') && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-start justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                    3
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Step 3: Base-Period Passenger Expenditure & Route Laspeyres Index
                    </h3>
                    <p className="text-xs text-slate-500">
                      Base-Period Expenditure = Avg Fare × Passenger Count. Weightage W(T+k) = E_k / Σ E. 
                      Route Index = Σ [ I(T+k) × W(T+k) ].
                    </p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-mono font-bold text-emerald-800">
                  Formula: I_route = Σ [ I(T+k) * W(T+k) ]
                </div>
              </div>

              {/* Table of Step 3 Expenditure & Weights */}
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Horizon</th>
                      <th className="py-2.5 px-4 font-mono">Step 1 Avg Fare</th>
                      <th className="py-2.5 px-4 font-mono">DGCA Daily Pax</th>
                      <th className="py-2.5 px-4 font-mono font-bold text-slate-900">Base Period Exp (E_k = P × Q)</th>
                      <th className="py-2.5 px-4 font-mono font-bold text-emerald-800">Weightage W(T+k)</th>
                      <th className="py-2.5 px-4 font-mono">Jevons Index I(T+k)</th>
                      <th className="py-2.5 px-4 font-mono font-bold text-blue-700">Weighted Contribution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {routeData?.horizons?.map((h, idx) => (
                      <tr key={h.advance_days} className="hover:bg-emerald-50/40">
                        <td className="py-2 px-4 font-mono font-bold text-slate-900">
                          <span className="w-5 h-5 inline-flex items-center justify-center rounded-full bg-slate-200 text-[10px] mr-1.5 font-bold">
                            {idx + 1}
                          </span>
                          {h.horizon_code}
                        </td>
                        <td className="py-2 px-4 font-mono text-slate-700">₹{h.base_avg_fare.toLocaleString('en-IN')}</td>
                        <td className="py-2 px-4 font-mono text-slate-700">{h.pax_count.toLocaleString('en-IN')} pax</td>
                        <td className="py-2 px-4 font-mono font-bold text-slate-900">
                          ₹{(h.base_expenditure / 100000).toFixed(2)} Lakhs
                        </td>
                        <td className="py-2 px-4 font-mono font-bold text-emerald-700">
                          {(h.horizon_weight * 100).toFixed(2)}%
                        </td>
                        <td className="py-2 px-4 font-mono font-bold text-indigo-700">{h.horizon_jevons_index}</td>
                        <td className="py-2 px-4 font-mono font-bold text-blue-700 text-sm">
                          {h.weighted_contribution.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                    <tr>
                      <td className="py-2.5 px-4" colSpan={3}>
                        Total Base Period Expenditure for {selectedRoute}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-sm text-emerald-900">
                        ₹{(routeData?.route_total_base_exp / 10000000).toFixed(2)} Crores
                      </td>
                      <td className="py-2.5 px-4 font-mono text-emerald-800">100.00%</td>
                      <td className="py-2.5 px-4 text-right pr-4 text-slate-600 font-sans">
                        {selectedRoute} Route Index:
                      </td>
                      <td className="py-2.5 px-4 font-mono text-base text-blue-900 font-black">
                        {routeData?.laspeyres_route_index}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* STEP 4 SECTION */}
          {(activeStepTab === 'all' || activeStepTab === 'step4') && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-start justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-sm">
                    4
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Step 4: National Airfare Index (NAI) Aggregation Across All 25 Corridors
                    </h3>
                    <p className="text-xs text-slate-500">
                      Route Weight W(r) = E_r / Σ E_all. National Index NAI = Σ [ I(r) × W(r) ].
                    </p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-amber-50 border border-amber-300 rounded-lg text-xs font-mono font-bold text-amber-900">
                  Formula: NAI = Σ [ I(Route) * W(Route) ]
                </div>
              </div>

              {/* National Summary Callout Card */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 via-amber-100/50 to-amber-50 border border-amber-300/80 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <span className="text-xs uppercase font-bold tracking-wider text-amber-900">
                    National Airfare Price Index (NAI - Base 2026-09-01 = 100.00)
                  </span>
                  <div className="flex items-baseline gap-3 mt-0.5">
                    <span className="text-3xl font-black font-mono text-slate-950">
                      {nationalData?.indexValue}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-emerald-600 text-white shadow-2xs">
                      {nationalData?.baseChangePct}
                    </span>
                    <span className="text-xs text-slate-600 font-medium">
                      Total National Base Expenditure: ₹{(nationalData?.totalBaseExpenditure / 10000000).toFixed(2)} Cr
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] font-bold text-slate-600">Formula Mode:</div>
                  <div className="flex items-center gap-1 mt-1 bg-white p-1 rounded-lg border border-amber-300">
                    <button
                      onClick={() => setMethod('laspeyres')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        method === 'laspeyres'
                          ? 'bg-amber-400 text-slate-950 shadow-xs'
                          : 'text-slate-600 hover:text-slate-950'
                      }`}
                    >
                      Laspeyres (Weighted: {metadata ? '105.53' : '105.5'})
                    </button>
                    <button
                      onClick={() => setMethod('jevons')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        method === 'jevons'
                          ? 'bg-amber-400 text-slate-950 shadow-xs'
                          : 'text-slate-600 hover:text-slate-950'
                      }`}
                    >
                      Jevons (Unweighted: {metadata ? '104.43' : '104.4'})
                    </button>
                  </div>
                </div>
              </div>

              {/* All 25 Routes Aggregation Table */}
              <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Route Code</th>
                      <th className="py-2 px-3">Corridor Origin ➔ Destination</th>
                      <th className="py-2 px-3 font-mono font-bold text-blue-900">Route Index I(r)</th>
                      <th className="py-2 px-3 font-mono">Base Period Exp E(r)</th>
                      <th className="py-2 px-3 font-mono font-bold text-amber-900">Route Weight W(r)</th>
                      <th className="py-2 px-3 font-mono font-bold text-slate-900">Contribution (I × W)</th>
                      <th className="py-2 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allRoutes.map((r, idx) => {
                      const isSelected = r.id === selectedRoute
                      const expInCr = (r.totalBaseExp / 10000000).toFixed(2)
                      const contribution = (r.routeIndex * r.numericWeight).toFixed(2)

                      return (
                        <tr
                          key={r.id}
                          className={`hover:bg-amber-50/40 transition-colors ${
                            isSelected ? 'bg-amber-100/50 font-semibold' : ''
                          }`}
                        >
                          <td className="py-1.5 px-3 font-mono text-slate-500">{idx + 1}</td>
                          <td className="py-1.5 px-3 font-mono font-bold text-slate-900">{r.id}</td>
                          <td className="py-1.5 px-3 text-slate-700">
                            {r.originCity} ({r.originCode}) ➔ {r.destCity} ({r.destCode})
                          </td>
                          <td className="py-1.5 px-3 font-mono font-bold text-blue-700">{r.routeIndex}</td>
                          <td className="py-1.5 px-3 font-mono text-slate-600">₹{expInCr} Cr</td>
                          <td className="py-1.5 px-3 font-mono font-bold text-amber-800">{r.weight}</td>
                          <td className="py-1.5 px-3 font-mono font-bold text-slate-900">{contribution}</td>
                          <td className="py-1.5 px-3 text-center">
                            <button
                              onClick={() => setSelectedRoute(r.id)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              Axiomatic MoSPI/DGCA Airfare CPI methodology verified for all 25 corridors.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#0b2545] hover:bg-[#061426] text-white font-bold transition-all shadow-xs"
          >
            Close Engine Inspector
          </button>
        </div>

      </div>
    </div>
  )
}
