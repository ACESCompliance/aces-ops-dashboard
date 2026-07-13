import { DAY_MS, stateCode } from './format'

// Turn the raw payload from /api/data into everything the UI renders.
export function derive(raw) {
  const {
    audits = [],
    sites = [],
    findings = [],
    actions = [],
    compLeads = [],
    digiLeads = [],
    workflowRuns = [],
    contacts = [],
    oshaStandards = 0,
  } = raw || {}

  const now = Date.now()
  const sevenDaysAgo = now - 7 * DAY_MS
  const siteById = new Map(sites.map((s) => [s.id, s]))
  const liveFindings = findings.filter((f) => !f.dismissed_at)

  // ---- Section 1: top metrics -------------------------------------------
  const auditsComplete = audits.filter((a) => a.status === 'complete').length
  const leadsWithEmail = compLeads.filter((l) => l.contact_email && l.contact_email.trim()).length
  const metrics = {
    auditsComplete,
    auditsTotal: audits.length,
    activeSites: sites.length,
    totalLeads: compLeads.length,
    digitalLeads: digiLeads.length,
    leadsWithEmail,
    leadEmailRate: compLeads.length ? (leadsWithEmail / compLeads.length) * 100 : 0,
    oshaStandards,
  }

  // ---- Section 2: audit activity ----------------------------------------
  const recentAudits = audits.slice(0, 10).map((a) => ({
    ...a,
    siteName: siteById.get(a.site_id)?.name || siteById.get(a.site_id)?.company_name || '—',
    state: siteById.get(a.site_id)?.state || null,
  }))

  const penaltyFromAudits = audits.reduce((s, a) => s + (Number(a.total_penalty_exposure) || 0), 0)
  const penaltyFromFindings = liveFindings.reduce((s, f) => s + (Number(f.estimated_penalty) || 0), 0)
  const costOfFindings = penaltyFromAudits || penaltyFromFindings

  // Severity buckets, mapped to critical / serious / other.
  const sev = { critical: 0, serious: 0, other: 0 }
  for (const f of liveFindings) {
    if (f.priority === 'critical' || f.severity === 'willful' || f.severity === 'repeat') sev.critical += 1
    else if (f.severity === 'serious') sev.serious += 1
    else sev.other += 1
  }
  const severityData = [
    { name: 'Critical', value: sev.critical, color: '#DC2626' },
    { name: 'Serious', value: sev.serious, color: '#F07316' },
    { name: 'Other', value: sev.other, color: '#60A5FA' },
  ]

  // Findings over time (last 30 days) for the activity chart.
  const findingsTrend = dailySeries(liveFindings, 30, 'created_at')

  const actionStatus = countBy(actions, (a) => a.status || 'open')
  const auditActivity = {
    recentAudits,
    costOfFindings,
    totalFindings: liveFindings.length,
    severityData,
    severityCounts: sev,
    findingsTrend,
    avgScore: avg(audits.map((a) => Number(a.compliance_score)).filter((n) => !isNaN(n))),
    actionsTotal: actions.length,
    actionStatus,
  }

  // ---- Section 3: lead pipeline -----------------------------------------
  const byTier = countBy(compLeads, (l) => l.lead_tier || 'unknown')
  const byEmailQuality = sortedEntries(countBy(compLeads, (l) => l.email_quality || 'unknown'))
  const byStatus = sortedEntries(countBy(compLeads, (l) => l.lead_status || 'unknown'))
  const recentLeads = compLeads.filter((l) => new Date(l.created_at).getTime() >= sevenDaysAgo)
  const leadPipeline = {
    total: compLeads.length,
    digital: digiLeads.length,
    byTier,
    byEmailQuality,
    byStatus,
    recentCount: recentLeads.length,
    recentLeads: recentLeads.slice(0, 8),
    leadsTrend: dailySeries(compLeads, 30, 'created_at'),
  }

  // ---- Section 4: geography ---------------------------------------------
  const siteStates = sortedEntries(countBy(sites, (s) => stateCode(s.state) || 'Unknown'))
  const leadStates = sortedEntries(countBy(compLeads, (l) => stateCode(l.state) || 'Unknown'))
  const leadCities = sortedEntries(
    countBy(compLeads, (l) => (l.city ? `${l.city}, ${stateCode(l.state) || ''}`.trim() : 'Unknown')),
  ).slice(0, 12)
  const geo = { siteStates, leadStates, leadCities }

  // ---- Section 5: n8n workflow health -----------------------------------
  const lastRun = workflowRuns[0] || null
  const runsTrend = workflowRuns
    .slice(0, 14)
    .reverse()
    .map((r) => ({
      label: new Date(r.run_started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      compliance: r.compliance_leads_added || 0,
      digital: r.digital_leads_added || 0,
    }))
  const apolloTotal = sumBy(workflowRuns, 'apollo_calls_made')
  const hunterTotal = sumBy(workflowRuns, 'hunter_calls_made')
  let healthLevel = 'red'
  if (lastRun) {
    const ageDays = (now - new Date(lastRun.run_started_at).getTime()) / DAY_MS
    if (lastRun.success && ageDays <= 3) healthLevel = 'green'
    else if (lastRun.success && ageDays <= 10) healthLevel = 'yellow'
    else healthLevel = 'red'
  }
  const workflow = {
    lastRun,
    runsTrend,
    totalRuns: workflowRuns.length,
    apolloTotal,
    hunterTotal,
    apolloEmails: sumBy(workflowRuns, 'apollo_emails_found'),
    hunterEmails: sumBy(workflowRuns, 'hunter_emails_found'),
    totalLeadsAdded: sumBy(workflowRuns, 'compliance_leads_added') + sumBy(workflowRuns, 'digital_leads_added'),
    healthLevel,
  }

  // ---- Section 6: website / consultation requests -----------------------
  const website = {
    contactCount: contacts.length,
    recent: contacts.slice(0, 8),
  }

  // ---- Section 8: actions generated -------------------------------------
  const actionsDetail = actions.map((a) => ({
    ...a,
    siteName: siteById.get(a.site_id)?.name || '—',
  }))

  return {
    metrics,
    auditActivity,
    leadPipeline,
    geo,
    workflow,
    website,
    actions: actionsDetail,
    health: raw.health,
    errors: raw.errors,
  }
}

// ---- helpers -------------------------------------------------------------
function countBy(rows, keyFn) {
  const m = {}
  for (const r of rows) {
    const k = keyFn(r)
    m[k] = (m[k] || 0) + 1
  }
  return m
}

function sortedEntries(obj) {
  return Object.entries(obj)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
}

function sumBy(rows, field) {
  return rows.reduce((s, r) => s + (Number(r[field]) || 0), 0)
}

function avg(arr) {
  if (!arr.length) return null
  return arr.reduce((s, n) => s + n, 0) / arr.length
}

function dailySeries(rows, days, dateField) {
  const buckets = new Map()
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(start.getTime() - i * DAY_MS)
    const key = d.toISOString().slice(0, 10)
    buckets.set(key, {
      date: key,
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: 0,
    })
  }
  const cutoff = start.getTime() - (days - 1) * DAY_MS
  for (const r of rows) {
    const t = new Date(r[dateField]).getTime()
    if (isNaN(t) || t < cutoff) continue
    const key = new Date(r[dateField]).toISOString().slice(0, 10)
    const b = buckets.get(key)
    if (b) b.count += 1
  }
  return Array.from(buckets.values())
}
