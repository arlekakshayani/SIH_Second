import {
  calculateNationalIndex,
  calculateRouteIndex,
  getAllRoutes,
  getDailyTrajectory,
  getLiveScrapedCorridors,
  getEconometricMetadata
} from './services/airfareCalculationEngine'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL !== undefined
    ? import.meta.env.VITE_API_BASE_URL
    : (typeof window !== 'undefined' && window.location.port === '5173' ? 'http://127.0.0.1:8000' : '')
).replace(/\/$/, '')

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const payload = await response.json()
      message = payload.detail || message
    } catch {
      // Keep the status-based message when the server did not return JSON.
    }
    throw new Error(message)
  }

  return response.json()
}

export async function getLatestIndex() {
  try {
    const data = await request('/api/index/latest')
    if (Array.isArray(data) && data.length > 0) return data
  } catch {
    // Graceful fallback to dynamic econometric calculation engine
  }

  const nat = calculateNationalIndex('latest', 'laspeyres')
  const routes = getAllRoutes('latest', 'laspeyres')

  return [
    {
      route: 'COMPOSITE',
      index_value: nat.indexValue,
      raw_index: nat.rawIndexValue,
      sample_size: nat.matchedObservations,
      inflation_rate: nat.inflationRate,
      method: nat.method,
      date: nat.date,
    },
    ...routes.map((r) => ({
      route: r.id,
      index_value: r.routeIndex,
      weight: r.numericWeight,
      sample_size: r.matchedFlightsCount,
    })),
  ]
}

export async function getIndexHistory(route, limit = 100) {
  try {
    const params = new URLSearchParams({ limit: String(limit) })
    if (route) params.set('route', route)
    const data = await request(`/api/index/history?${params.toString()}`)
    if (Array.isArray(data) && data.length > 0) return data
  } catch {
    // Graceful fallback to dynamic time series
  }

  const traj = getDailyTrajectory('laspeyres')
  return traj.slice(-limit).map((pt) => ({
    date: pt.fullDate,
    index_value: pt.index,
    baseline: pt.baseline,
    route: route || 'COMPOSITE',
  }))
}

export async function getFlights({ route, advanceDays, limit = 100 } = {}) {
  try {
    const params = new URLSearchParams({ limit: String(limit) })
    if (route) params.set('route', route)
    if (advanceDays !== undefined && advanceDays !== null) {
      params.set('advance_days', String(advanceDays))
    }
    const data = await request(`/api/flights/?${params.toString()}`)
    if (Array.isArray(data) && data.length > 0) return data
  } catch {
    // Graceful fallback to dynamic live corridors
  }

  let list = getLiveScrapedCorridors('All', route || '')
  if (advanceDays !== undefined && advanceDays !== null) {
    list = list.filter((f) => f.advance_days === Number(advanceDays))
  }
  return list.slice(0, limit).map((f) => ({
    id: f.id,
    route: f.route_code,
    airline: f.airline,
    flight_number: f.flight_number,
    advance_days: f.advance_days,
    base_fare: f.pureFare,
    total_fare: f.rawFare,
    taxes: f.ancillary,
    data_source: f.platform,
    availability: 'Few Seats Left',
    created_at: f.time,
  }))
}

export async function getRoutes() {
  try {
    const data = await request('/api/routes/')
    if (Array.isArray(data) && data.length > 0) return data
  } catch {
    // Graceful fallback
  }

  return getAllRoutes('latest', 'laspeyres')
}

export function calculateIndex(calculationDate) {
  return request('/api/index/calculate', {
    method: 'POST',
    body: JSON.stringify(calculationDate ? { calculation_date: calculationDate } : {}),
  }).catch(() => {
    return calculateNationalIndex(calculationDate || 'latest', 'laspeyres')
  })
}

export function getExportUrl(route) {
  const params = route ? `?route=${encodeURIComponent(route)}` : ''
  return `${API_BASE_URL}/api/export/csv${params}`
}

export { API_BASE_URL }

