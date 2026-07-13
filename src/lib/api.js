import { getKey, clearKey } from './auth'

// In production the functions are served at /api/* (see the config path in each
// function). VITE_API_BASE lets a plain `vite dev` point at a running `netlify dev`.
const API_BASE = import.meta.env.VITE_API_BASE || ''

async function get(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'x-ops-key': getKey() },
  })
  if (res.status === 401) {
    // Key was revoked/changed server-side — force re-login.
    clearKey()
    window.location.reload()
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    let detail = ''
    try {
      detail = (await res.json()).error || ''
    } catch {
      /* ignore */
    }
    throw new Error(detail || `${path} returned ${res.status}`)
  }
  return res.json()
}

export function fetchData() {
  return get('/api/data')
}

// Signed, short-lived URLs for an audit's photos (private storage bucket).
export function fetchAuditPhotos(auditId) {
  return get(`/api/photos?audit_id=${encodeURIComponent(auditId)}`)
}
