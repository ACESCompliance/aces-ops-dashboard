// ACES Ops — server-side data aggregator.
//
// Runs on Netlify (Node 18+). Queries Supabase with the SERVICE ROLE key so it
// bypasses the audit app's row-level security without needing any RLS changes,
// and the privileged key never reaches the browser. The React app fetches this
// single endpoint at /.netlify/functions/data.

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://wuwdmqkblrbigdoehbrv.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPS_PASSWORD = process.env.OPS_PASSWORD || ''

const REST = `${SUPABASE_URL}/rest/v1`

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
}

// Fetch every row of a table (paging past PostgREST's 1000-row cap), selecting
// only the columns we need. Returns { rows, ms, error }.
async function fetchTable(table, columns, { order } = {}) {
  const t0 = Date.now()
  const rows = []
  try {
    for (let from = 0; from < 50000; from += 1000) {
      const params = new URLSearchParams({ select: columns })
      if (order) params.set('order', order)
      const res = await fetch(`${REST}/${table}?${params.toString()}`, {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          Range: `${from}-${from + 999}`,
          'Range-Unit': 'items',
        },
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(`${res.status} ${body.slice(0, 160)}`)
      }
      const batch = await res.json()
      rows.push(...batch)
      if (batch.length < 1000) break
    }
    return { rows, ms: Date.now() - t0, error: null }
  } catch (e) {
    return { rows, ms: Date.now() - t0, error: String(e.message || e) }
  }
}

// Exact row count via a HEAD request — cheap, used for the health probe.
async function countTable(table) {
  const t0 = Date.now()
  try {
    const res = await fetch(`${REST}/${table}?select=id`, {
      method: 'HEAD',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Prefer: 'count=exact',
        Range: '0-0',
      },
    })
    const cr = res.headers.get('content-range') || ''
    const total = cr.includes('/') ? Number(cr.split('/')[1]) : null
    return { ok: res.ok, status: res.status, count: total, ms: Date.now() - t0 }
  } catch (e) {
    return { ok: false, status: 0, count: null, ms: Date.now() - t0, error: String(e) }
  }
}

export default async (req) => {
  if (!SERVICE_KEY) {
    return new Response(
      JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server.' }),
      { status: 500, headers: JSON_HEADERS },
    )
  }

  // Optional shared-secret gate. If OPS_PASSWORD is set, require it.
  if (OPS_PASSWORD) {
    const url = new URL(req.url)
    const provided = req.headers.get('x-ops-key') || url.searchParams.get('key') || ''
    if (provided !== OPS_PASSWORD) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: JSON_HEADERS,
      })
    }
  }

  const startedAt = Date.now()

  const [
    audits,
    sites,
    findings,
    actions,
    compLeads,
    digiLeads,
    workflowRuns,
    contacts,
    oshaCount,
  ] = await Promise.all([
    fetchTable(
      'app_audits',
      'id,site_id,title,audit_date,status,compliance_score,total_findings,actual_findings_count,potential_findings_count,total_penalty_exposure,created_at,completed_at',
      { order: 'created_at.desc' },
    ),
    fetchTable(
      'app_sites',
      'id,name,company_name,city,state,site_type,subscription_tier,subscription_status,photos_used_this_month,created_at',
    ),
    fetchTable(
      'app_findings',
      'id,audit_id,finding_type,cfr_citation,title,severity,priority,estimated_penalty,created_at,dismissed_at',
    ),
    fetchTable(
      'app_actions',
      'id,site_id,audit_id,title,assigned_to_name,due_date,status,priority,created_at,completed_at',
      { order: 'created_at.desc' },
    ),
    fetchTable(
      'aces_compliance_leads',
      'id,business_name,business_type,city,state,contact_email,contact_name,contact_title,lead_status,lead_tier,email_quality,google_rating,date_found,created_at',
      { order: 'created_at.desc' },
    ),
    fetchTable('aces_digital_leads', 'id,city,state,trade_category,contact_email,lead_status,created_at'),
    fetchTable(
      'aces_workflow_runs',
      'id,workflow_name,run_started_at,run_completed_at,success,compliance_leads_added,digital_leads_added,total_searched,city_pair,error_message,apollo_calls_made,apollo_names_found,apollo_emails_found,hunter_calls_made,hunter_emails_found,enterprise_flagged,amazon_blocked,bigbox_blocked,created_at',
      { order: 'run_started_at.desc' },
    ),
    // Website consultation + scorecard submissions captured by the marketing
    // site (aces-website) directly into Supabase.
    fetchTable(
      'website_consultation_requests',
      'id,name,email,phone,company,message,source,created_at',
      { order: 'created_at.desc' },
    ),
    countTable('osha_standards'),
  ])

  // Health probe: which core endpoints respond, and how fast.
  const health = {
    restReachable: !audits.error,
    probes: [
      { name: 'app_audits', ok: !audits.error, ms: audits.ms, error: audits.error },
      { name: 'app_findings', ok: !findings.error, ms: findings.ms, error: findings.error },
      { name: 'aces_compliance_leads', ok: !compLeads.error, ms: compLeads.ms, error: compLeads.error },
      { name: 'aces_workflow_runs', ok: !workflowRuns.error, ms: workflowRuns.ms, error: workflowRuns.error },
      { name: 'osha_standards', ok: oshaCount.ok, ms: oshaCount.ms, error: oshaCount.error || null },
    ],
    serverMs: Date.now() - startedAt,
  }

  const payload = {
    fetchedAt: new Date().toISOString(),
    audits: audits.rows,
    sites: sites.rows,
    findings: findings.rows,
    actions: actions.rows,
    compLeads: compLeads.rows,
    digiLeads: digiLeads.rows,
    workflowRuns: workflowRuns.rows,
    contacts: contacts.error ? [] : contacts.rows,
    oshaStandards: oshaCount.count ?? 0,
    health,
    errors: {
      audits: audits.error,
      sites: sites.error,
      findings: findings.error,
      actions: actions.error,
      compLeads: compLeads.error,
      digiLeads: digiLeads.error,
      workflowRuns: workflowRuns.error,
      contacts: contacts.error,
    },
  }

  return new Response(JSON.stringify(payload), { status: 200, headers: JSON_HEADERS })
}

export const config = { path: '/api/data' }
