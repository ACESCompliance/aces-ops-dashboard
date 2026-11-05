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

export async function fetchLeads({ archived = false } = {}) {
  const qs = archived ? '?archived=1' : ''
  const res = await fetch(`${API_BASE}/api/crm${qs}`, { headers: keyHeaders() })
  return (await unwrap(res)).leads || []
}

export async function fetchSummary() {
  const res = await fetch(`${API_BASE}/api/crm?summary=1`, { headers: keyHeaders() })
  return unwrap(res)
}

export async function fetchActivities(leadId) {
  const res = await fetch(`${API_BASE}/api/crm?lead_id=${encodeURIComponent(leadId)}`, {
    headers: keyHeaders(),
  })
  return (await unwrap(res)).activities || []
}

// extra: { channel, direction, step } — any left out are filled by the database.
export async function addActivity(leadId, activityType, description, extra = {}) {
  const res = await fetch(`${API_BASE}/api/crm`, {
    method: 'POST',
    headers: { ...keyHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead_id: leadId, activity_type: activityType, description, ...extra }),
  })
  return (await unwrap(res)).activity
}

// Every outreach touch (outbound) and reply (inbound) since the v2 reset.
export async function fetchTouches() {
  const res = await fetch(`${API_BASE}/api/crm?touches=1`, { headers: keyHeaders() })
  return (await unwrap(res)).touches || []
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

// v2 pipeline (Oct 2026): AI-adoption practice for multi-site manufacturers.
// Day one = 'captured'. Nour sends every message himself; the lead agent only
// drafts. 'archived_v1' holds the OSHA-era book and is hidden by default.
export const STAGES = [
  { key: 'captured', label: 'Captured', color: '#64748B' },
  { key: 'messaged', label: 'Messaged', color: '#60A5FA' },
  { key: 'replied', label: 'Replied', color: '#22D3EE' },
  { key: 'session_held', label: 'Session Held', color: '#A855F7' },
  { key: 'proposal_sent', label: 'Proposal Sent', color: '#F59E0B' },
  { key: 'won', label: 'Won', color: '#16A34A' },
  { key: 'lost', label: 'Lost', color: '#DC2626' },
  { key: 'unqualified', label: 'Unqualified', color: '#6B7280' },
  { key: 'archived_v1', label: 'Archived (v1)', color: '#475569' },
]

// Stages where follow-up reminders no longer apply.
export const CLOSED_STAGES = new Set(['won', 'lost', 'unqualified', 'archived_v1'])

export const STAGE_BY_KEY = Object.fromEntries(STAGES.map((s) => [s.key, s]))

export const ACTIVITY_TYPES = [
  { key: 'email', label: 'Email sent', icon: '✉️' },
  { key: 'linkedin', label: 'LinkedIn message', icon: '💬' },
  { key: 'call', label: 'Phone call', icon: '📞' },
  { key: 'text', label: 'Text message', icon: '📱' },
  { key: 'reply', label: 'Reply received', icon: '↩️' },
  { key: 'meeting', label: 'Meeting', icon: '🤝' },
  { key: 'note', label: 'Note', icon: '📝' },
  { key: 'follow_up', label: 'Follow-up reminder', icon: '🔔' },
]

// Outreach channels. activity = the activity_type logged when Nour sends on it.
// sendable = shows up as a "Mark sent" option on a lead.
export const CHANNELS = [
  { key: 'email', label: 'Email', icon: '✉️', color: '#16A34A', activity: 'email', sendable: true },
  { key: 'linkedin', label: 'LinkedIn', icon: '💬', color: '#60A5FA', activity: 'linkedin', sendable: true },
  { key: 'phone', label: 'Phone', icon: '📞', color: '#F59E0B', activity: 'call', sendable: true },
  { key: 'text', label: 'Text', icon: '📱', color: '#A855F7', activity: 'text', sendable: true },
  { key: 'in_person', label: 'In person', icon: '🤝', color: '#22D3EE', activity: 'meeting', sendable: false },
  { key: 'other', label: 'Video / other', icon: '🖥️', color: '#94A3B8', activity: 'meeting', sendable: false },
]
export const CHANNEL_BY_KEY = Object.fromEntries(CHANNELS.map((c) => [c.key, c]))
export const SEND_CHANNELS = CHANNELS.filter((c) => c.sendable)

// Activity types that count as an outreach send (vs. a meeting, note or reminder).
export const SEND_TYPES = new Set(['email', 'linkedin', 'call', 'text'])

export const STEP_LABEL = {
  first: 'First message',
  fu1: 'Follow-up 1',
  fu2: 'Follow-up 2',
  other: 'Extra touch',
  v1: 'v1 (OSHA era)',
}
export const STEP_SHORT = { first: '1st', fu1: 'FU1', fu2: 'FU2', other: 'Extra', v1: 'v1' }

// Roll touches up per lead: sends by channel, sends by channel+step, the steps
// reached, the last send, and the first reply (with the channel it came in on).
export function touchesByLead(touches) {
  const map = new Map()
  for (const t of touches || []) {
    let r = map.get(t.lead_id)
    if (!r) {
      r = { byChannel: {}, byChannelStep: {}, steps: new Set(), last: null, reply: null, sends: 0 }
      map.set(t.lead_id, r)
    }
    if (t.direction === 'inbound') {
      if (!r.reply || new Date(t.created_at) < new Date(r.reply.created_at)) r.reply = t
      continue
    }
    if (t.direction !== 'outbound' || !SEND_TYPES.has(t.activity_type) || !t.channel) continue
    r.sends += 1
    r.byChannel[t.channel] = (r.byChannel[t.channel] || 0) + 1
    const step = t.step || 'other'
    r.byChannelStep[`${t.channel}:${step}`] = (r.byChannelStep[`${t.channel}:${step}`] || 0) + 1
    r.steps.add(step)
    if (!r.last || new Date(t.created_at) >= new Date(r.last.created_at)) r.last = t
  }
  return map
}

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
  return l.pipeline_stage || 'captured'
}

// Where a contact sits in the outreach sequence: first message, follow-up 1,
// follow-up 2 (the last), or past outreach (they replied). Drives the message
// box title, what "Mark sent" logs, and when the next follow-up is due.
const PAST_OUTREACH = new Set(['replied', 'session_held', 'proposal_sent', 'won', 'lost', 'unqualified', 'archived_v1'])
export function messageStep(l) {
  const sends = Number(l.interaction_count) || 0
  const stage = l.pipeline_stage || 'captured'
  if (PAST_OUTREACH.has(stage)) {
    return { key: 'reply', title: 'Reply', sentLabel: 'Message sent', nextDays: null,
      help: 'This contact is past the outreach sequence. Marking sent logs the message without scheduling a follow-up.' }
  }
  if (sends <= 0) {
    return { key: 'first', title: 'First Message', sentLabel: 'First message sent', nextDays: 3,
      help: 'Marking sent moves this contact to Messaged and schedules follow-up 1 in 3 days.' }
  }
  if (sends === 1) {
    return { key: 'fu1', title: 'Follow-up 1', sentLabel: 'Follow-up 1 sent', nextDays: 5,
      help: 'Marking sent logs follow-up 1 and schedules the final follow-up in 5 days.' }
  }
  if (sends === 2) {
    return { key: 'fu2', title: 'Follow-up 2 · final', sentLabel: 'Follow-up 2 sent', nextDays: null,
      help: 'This is the last message in the sequence. Marking sent closes the follow-ups; the contact stays in Messaged.' }
  }
  return { key: 'done', title: 'Message', sentLabel: 'Message sent', nextDays: null,
    help: 'The three-message sequence is complete. Marking sent logs the message without scheduling a follow-up.' }
}

export function hasDraft(l) {
  return Boolean(l.draft_message && l.draft_message.trim())
}

// First message is pre-filled into the user's own mail client; nothing is sent
// by the dashboard itself.
export function mailtoFor(l) {
  if (!l.contact_email) return null
  const first = (l.first_name || leadName(l).split(' ')[0] || '').trim()
  const subject = encodeURIComponent(`Quick question about your supervisors' admin load${l.business_name ? ' at ' + l.business_name : ''}`)
  const body = encodeURIComponent((l.draft_message || `Hi ${first},\n\n`).replace(/\r/g, ''))
  return `mailto:${l.contact_email}?subject=${subject}&body=${body}`
}
