import { getKey } from './auth'

// In production the function is served at /api/crm (see config path in crm.mjs).
// VITE_API_BASE lets a plain `vite dev` point at a running `netlify dev`.
const API_BASE = import.meta.env.VITE_API_BASE || ''

// Read the key lazily so login (which sets it) always wins.
const keyHeaders = () => ({ 'x-ops-key': getKey() })

async function unwrap(res) {
  if (!res.ok) {
    let detail = ''
    try {
      detail = (await res.json()).error || ''
    } catch {
      /* ignore */
    }
    throw new Error(detail || `CRM endpoint returned ${res.status}`)
  }
  return res.json()
}

export async function fetchLeads() {
  const res = await fetch(`${API_BASE}/api/crm`, { headers: keyHeaders() })
  return (await unwrap(res)).leads || []
}

export async function fetchActivities(leadId) {
  const res = await fetch(`${API_BASE}/api/crm?lead_id=${encodeURIComponent(leadId)}`, {
    headers: keyHeaders(),
  })
  return (await unwrap(res)).activities || []
}

export async function addActivity(leadId, activityType, description) {
  const res = await fetch(`${API_BASE}/api/crm`, {
    method: 'POST',
    headers: { ...keyHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead_id: leadId, activity_type: activityType, description }),
  })
  return (await unwrap(res)).activity
}

export async function updateLead(leadId, fields) {
  const res = await fetch(`${API_BASE}/api/crm`, {
    method: 'PUT',
    headers: { ...keyHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead_id: leadId, fields }),
  })
  return (await unwrap(res)).lead
}

// ---- shared CRM config + helpers ----------------------------------------

export const STAGES = [
  { key: 'new_lead', label: 'New Lead', color: '#64748B' },
  { key: 'contacted', label: 'Contacted', color: '#60A5FA' },
  { key: 'meeting_booked', label: 'Meeting Booked', color: '#A855F7' },
  { key: 'proposal_sent', label: 'Proposal Sent', color: '#F59E0B' },
  { key: 'free_audit_offered', label: 'Free Audit', color: '#F07316' },
  { key: 'client_won', label: 'Client Won', color: '#16A34A' },
  { key: 'lost', label: 'Lost', color: '#DC2626' },
  // Not a loss — a lead that never should have been in the pipeline. Muted gray.
  { key: 'unqualified', label: 'Unqualified', color: '#6B7280' },
]

export const STAGE_BY_KEY = Object.fromEntries(STAGES.map((s) => [s.key, s]))

export const ACTIVITY_TYPES = [
  { key: 'call', label: 'Call', icon: '📞' },
  { key: 'email', label: 'Email', icon: '✉️' },
  { key: 'meeting', label: 'Meeting', icon: '🤝' },
  { key: 'note', label: 'Note', icon: '📝' },
  { key: 'follow_up', label: 'Follow-up', icon: '🔔' },
]

export const ACTIVITY_BY_KEY = Object.fromEntries(ACTIVITY_TYPES.map((a) => [a.key, a]))

// Best available human name for a lead.
export function leadName(l) {
  if (l.contact_name && l.contact_name.trim()) return l.contact_name.trim()
  const joined = [l.first_name, l.last_name].filter(Boolean).join(' ').trim()
  return joined || ''
}

export function hasEmail(l) {
  return Boolean(l.contact_email && l.contact_email.trim())
}

// Higher = more complete. Used to surface the most actionable leads first.
export function completeness(l) {
  let score = 0
  if (hasEmail(l)) score += 4
  if (leadName(l)) score += 2
  if (l.phone) score += 1
  return score
}

export function stageOf(l) {
  return l.pipeline_stage || 'new_lead'
}
