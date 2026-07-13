import { PASSWORD } from './auth'

// In production the function is served at /api/data (see netlify.toml config
// path). VITE_API_BASE lets a plain `vite dev` point at a running `netlify dev`.
const API_BASE = import.meta.env.VITE_API_BASE || ''

export async function fetchData() {
  const res = await fetch(`${API_BASE}/api/data`, {
    headers: { 'x-ops-key': PASSWORD },
  })
  if (!res.ok) {
    let detail = ''
    try {
      detail = (await res.json()).error || ''
    } catch {
      /* ignore */
    }
    throw new Error(detail || `Data endpoint returned ${res.status}`)
  }
  return res.json()
}
