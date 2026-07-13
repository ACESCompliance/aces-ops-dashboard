// ACES Ops — CRM endpoint.
//
// Runs on Netlify (Node 18+). Queries Supabase with the SERVICE ROLE key so it
// bypasses RLS, keeping the privileged key server-side. Backs the CRM tab.
//
//   GET  /api/crm                  → { leads: [...] }            (all CRM leads)
//   GET  /api/crm?lead_id=<uuid>   → { activities: [...] }       (timeline for a lead)
//   POST /api/crm                  → add an activity             (password-protected)
//   PUT  /api/crm                  → update lead fields          (password-protected)
//
// POST body: { lead_id, activity_type, description }
// PUT  body: { lead_id, fields: { pipeline_stage, linkedin_url, facebook_url,
//              instagram_url, next_followup_at, last_contacted_at, outreach_notes } }

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://wuwdmqkblrbigdoehbrv.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
// Mutations always require the password. OPS_PASSWORD overrides the default that
// matches the dashboard login the browser already sends as x-ops-key.
const OPS_PASSWORD = process.env.OPS_PASSWORD || 'aces2026'

const REST = `${SUPABASE_URL}/rest/v1`

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
}

const LEAD_COLUMNS = [
  'id', 'business_name', 'business_type', 'address', 'city', 'state', 'zip',
  'phone', 'website', 'google_rating', 'review_count', 'contact_name',
  'contact_email', 'contact_title', 'linkedin_url', 'lead_tier', 'lead_status',
  'email_quality', 'email_source', 'outreach_notes', 'first_name', 'last_name',
  'pipeline_stage', 'facebook_url', 'instagram_url', 'last_contacted_at',
  'next_followup_at', 'interaction_count',
].join(',')

// Fields the client is permitted to PATCH onto a lead.
const EDITABLE_FIELDS = new Set([
  'pipeline_stage', 'lead_status', 'linkedin_url', 'facebook_url',
  'instagram_url', 'next_followup_at', 'last_contacted_at', 'outreach_notes',
  'contact_name', 'contact_email', 'contact_title', 'phone',
])

const supaHeaders = (extra = {}) => ({
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  ...extra,
})

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

// Page past PostgREST's 1000-row cap, selecting only the columns we need.
async function fetchAll(table, columns, order) {
  const rows = []
  for (let from = 0; from < 50000; from += 1000) {
    const params = new URLSearchParams({ select: columns })
    if (order) params.set('order', order)
    const res = await fetch(`${REST}/${table}?${params.toString()}`, {
      headers: supaHeaders({ Range: `${from}-${from + 999}`, 'Range-Unit': 'items' }),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`${res.status} ${body.slice(0, 160)}`)
    }
    const batch = await res.json()
    rows.push(...batch)
    if (batch.length < 1000) break
  }
  return rows
}

function authorized(req) {
  const url = new URL(req.url)
  const provided = req.headers.get('x-ops-key') || url.searchParams.get('key') || ''
  return provided === OPS_PASSWORD
}

export default async (req) => {
  if (!SERVICE_KEY) {
    return json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server.' }, 500)
  }

  const url = new URL(req.url)
  const method = req.method.toUpperCase()

  try {
    // ---- GET: leads list, or one lead's activity timeline -----------------
    if (method === 'GET') {
      const leadId = url.searchParams.get('lead_id')
      if (leadId) {
        const params = new URLSearchParams({
          select: 'id,lead_id,activity_type,description,created_at',
          lead_id: `eq.${leadId}`,
          order: 'created_at.desc',
        })
        const res = await fetch(`${REST}/aces_lead_activities?${params.toString()}`, {
          headers: supaHeaders(),
        })
        if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 160)}`)
        return json({ activities: await res.json() })
      }

      const leads = await fetchAll('aces_compliance_leads', LEAD_COLUMNS, 'created_at.desc')
      return json({ leads, fetchedAt: new Date().toISOString() })
    }

    // ---- POST: add an activity (password-protected) -----------------------
    if (method === 'POST') {
      if (!authorized(req)) return json({ error: 'Unauthorized' }, 401)
      const body = await req.json().catch(() => ({}))
      const { lead_id, activity_type, description } = body
      if (!lead_id || !activity_type) {
        return json({ error: 'lead_id and activity_type are required.' }, 400)
      }

      const res = await fetch(`${REST}/aces_lead_activities`, {
        method: 'POST',
        headers: supaHeaders({
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        }),
        body: JSON.stringify({
          lead_id,
          activity_type,
          description: description || '',
        }),
      })
      if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`)
      const inserted = (await res.json())[0] || null

      // Logging a real touch (call/email/meeting) advances the contact clock so
      // the "never contacted" and overdue lists stay accurate.
      if (['call', 'email', 'meeting'].includes(activity_type)) {
        await fetch(`${REST}/aces_compliance_leads?id=eq.${lead_id}`, {
          method: 'PATCH',
          headers: supaHeaders({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
          body: JSON.stringify({ last_contacted_at: new Date().toISOString() }),
        }).catch(() => {})
      }

      return json({ activity: inserted })
    }

    // ---- PUT: update lead fields (password-protected) ---------------------
    if (method === 'PUT') {
      if (!authorized(req)) return json({ error: 'Unauthorized' }, 401)
      const body = await req.json().catch(() => ({}))
      const { lead_id, fields } = body
      if (!lead_id || !fields || typeof fields !== 'object') {
        return json({ error: 'lead_id and fields are required.' }, 400)
      }

      const patch = {}
      for (const [k, v] of Object.entries(fields)) {
        if (EDITABLE_FIELDS.has(k)) patch[k] = v === '' ? null : v
      }
      if (Object.keys(patch).length === 0) {
        return json({ error: 'No editable fields supplied.' }, 400)
      }

      const res = await fetch(`${REST}/aces_compliance_leads?id=eq.${lead_id}`, {
        method: 'PATCH',
        headers: supaHeaders({
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        }),
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`)
      const updated = (await res.json())[0] || null
      return json({ lead: updated })
    }

    return json({ error: `Method ${method} not allowed.` }, 405)
  } catch (e) {
    return json({ error: String(e.message || e) }, 500)
  }
}

export const config = { path: '/api/crm' }
