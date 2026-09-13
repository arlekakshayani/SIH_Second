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

export function getLatestIndex() {
  return request('/api/index/latest')
}

export function getIndexHistory(route, limit = 100) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (route) params.set('route', route)
  return request(`/api/index/history?${params.toString()}`)
}

export function getFlights({ route, advanceDays, limit = 100 } = {}) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (route) params.set('route', route)
  if (advanceDays !== undefined && advanceDays !== null) {
    params.set('advance_days', String(advanceDays))
  }
  return request(`/api/flights/?${params.toString()}`)
}

export function getRoutes() {
  return request('/api/routes/')
}

export function calculateIndex(calculationDate) {
  return request('/api/index/calculate', {
    method: 'POST',
    body: JSON.stringify(calculationDate ? { calculation_date: calculationDate } : {}),
  })
}

export function getExportUrl(route) {
  const params = route ? `?route=${encodeURIComponent(route)}` : ''
  return `${API_BASE_URL}/api/export/csv${params}`
}

export { API_BASE_URL }
