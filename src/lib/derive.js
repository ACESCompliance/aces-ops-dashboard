import { DAY_MS, stateCode } from './format'

// Turn the raw payload from /api/data into everything the UI renders.
export function derive(raw) {
  const {
    audits = [],
    sites = [],
    findings = [],
    actions = [],
    users = [],
    members = [],
    photos = [],
    actionUpdates = [],
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
  // Website Enricher stats — computed straight from lead rows so the panel
  // works without new run-log columns. Tripwire: 48h of leads with zero
  // contact data means enrichment is silently broken (the June failure mode).
  const hasRealSite = (l) => (l.website || '').startsWith('http')
  const hasEmail = (l) => !!(l.contact_email && l.contact_email.trim())
  const hasSocial = (l) => !!(l.linkedin_company_url || l.facebook_url || l.instagram_url)
  const leads24h = compLeads.filter((l) => new Date(l.created_at).getTime() >= now - DAY_MS)
  const leads48h = compLeads.filter((l) => new Date(l.created_at).getTime() >= now - 2 * DAY_MS)
  const enrichment = {
    leads24: leads24h.length,
    withSite24: leads24h.filter(hasRealSite).length,
    emails24: leads24h.filter(hasEmail).length,
    socials24: leads24h.filter(hasSocial).length,
    pendingQueue: compLeads.filter(
      (l) =>
        hasRealSite(l) &&
        ['pending_enrichment', 'enrichment_deferred'].includes(l.email_quality) &&
        (l.enrichment_attempts || 0) < 2,
    ).length,
    linkedinTotal: compLeads.filter((l) => l.linkedin_company_url).length,
    facebookTotal: compLeads.filter((l) => l.facebook_url).length,
    instagramTotal: compLeads.filter((l) => l.instagram_url).length,
    tripwire:
      leads48h.length >= 5 && !leads48h.some((l) => hasEmail(l) || hasSocial(l)),
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
    healthLevel: enrichment.tripwire && healthLevel === 'green' ? 'yellow' : healthLevel,
    enrichment,
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

  // ---- Section 9: drill-down joins ---------------------------------------
  const userById = new Map(users.map((u) => [u.id, u]))
  const auditsBySite = groupBy(audits, (a) => a.site_id)
  const findingsByAudit = groupBy(findings, (f) => f.audit_id)
  const photosByAudit = groupBy(photos, (p) => p.audit_id)
  const actionsByAudit = groupBy(actions, (a) => a.audit_id)
  const actionsBySite = groupBy(actions, (a) => a.site_id)
  const updatesByAction = groupBy(actionUpdates, (u) => u.action_id)

  const membersBySite = groupBy(members, (m) => m.site_id)
  const memberView = (m) => {
    const u = userById.get(m.user_id)
    return {
      id: m.id,
      role: m.role,
      joined_at: m.joined_at,
      name: u?.full_name || '—',
      email: u?.email || '—',
    }
  }

  const sitesDetail = sites
    .map((s) => {
      const sAudits = (auditsBySite.get(s.id) || [])
        .slice()
        .sort((a, b) => new Date(b.audit_date || b.created_at) - new Date(a.audit_date || a.created_at))
      const mems = (membersBySite.get(s.id) || []).map(memberView)
      const owner = mems.find((m) => m.role === 'owner') || null
      const latest = sAudits[0] || null
      const sActions = actionsBySite.get(s.id) || []
      const openActions = sActions.filter((a) => a.status !== 'completed' && a.status !== 'cancelled')
      // Oldest → newest for the score trend line.
      const scoreTrend = sAudits
        .slice()
        .reverse()
        .filter((a) => a.compliance_score != null)
        .map((a) => ({
          date: a.audit_date || a.created_at,
          score: Number(a.compliance_score),
          title: a.title,
          id: a.id,
        }))
      return {
        ...s,
        owner,
        members: mems,
        audits: sAudits,
        auditCount: sAudits.length,
        completedAudits: sAudits.filter((a) => a.status === 'complete').length,
        latestScore: latest?.compliance_score != null ? Number(latest.compliance_score) : null,
        latestAuditDate: latest ? latest.audit_date || latest.created_at : null,
        penaltyExposure: sAudits.reduce((t, a) => t + (Number(a.total_penalty_exposure) || 0), 0),
        findingsCount: sAudits.reduce((t, a) => t + (findingsByAudit.get(a.id) || []).length, 0),
        photosCount: sAudits.reduce((t, a) => t + (photosByAudit.get(a.id) || []).length, 0),
        openActionsCount: openActions.length,
        actions: sActions,
        scoreTrend,
      }
    })
    .sort((a, b) => b.auditCount - a.auditCount || a.name.localeCompare(b.name))

  const auditsDetail = audits.map((a) => {
    const site = siteById.get(a.site_id)
    const creator = userById.get(a.created_by)
    const aFindings = findingsByAudit.get(a.id) || []
    const aActions = (actionsByAudit.get(a.id) || []).map((ac) => ({
      ...ac,
      updates: updatesByAction.get(ac.id) || [],
    }))
    return {
      ...a,
      siteName: site?.name || '—',
      siteCompany: site?.company_name || null,
      creatorName: creator?.full_name || null,
      creatorEmail: creator?.email || null,
      findings: aFindings,
      photosMeta: photosByAudit.get(a.id) || [],
      actions: aActions,
    }
  })

  const detail = {
    sites: sitesDetail,
    siteById: Object.fromEntries(sitesDetail.map((s) => [s.id, s])),
    audits: auditsDetail,
    auditById: Object.fromEntries(auditsDetail.map((a) => [a.id, a])),
  }

  // ---- Section 10: trends -------------------------------------------------
  // Monthly buckets from the first event to now (min 3 months so charts have room).
  const monthKey = (d) => {
    const t = new Date(d)
    return isNaN(t) ? null : `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`
  }
  const allDates = [
    ...audits.map((a) => a.created_at),
    ...photos.map((p) => p.uploaded_at),
    ...actions.map((a) => a.completed_at || a.created_at),
    ...findings.map((f) => f.created_at),
  ].filter(Boolean)
  const months = monthRange(allDates, 3)

  const engagementBySite = {}
  const engagement = months.map((mk) => {
    const row = { month: mk, label: monthLabel(mk), audits: 0, photos: 0, actionsDone: 0 }
    return row
  })
  const engIdx = new Map(engagement.map((r, i) => [r.month, i]))
  const siteNameOf = (siteId) => siteById.get(siteId)?.name || 'Unknown'
  const bump = (mk, siteId, field) => {
    const i = engIdx.get(mk)
    if (i == null) return
    engagement[i][field] += 1
    const sn = siteNameOf(siteId)
    if (!engagementBySite[sn]) {
      engagementBySite[sn] = months.map((m) => ({
        month: m, label: monthLabel(m), audits: 0, photos: 0, actionsDone: 0,
      }))
    }
    engagementBySite[sn][i][field] += 1
  }
  const auditSiteById = new Map(audits.map((a) => [a.id, a.site_id]))
  for (const a of audits) bump(monthKey(a.created_at), a.site_id, 'audits')
  for (const p of photos) bump(monthKey(p.uploaded_at), auditSiteById.get(p.audit_id), 'photos')
  for (const a of actions) {
    if (a.completed_at) bump(monthKey(a.completed_at), a.site_id, 'actionsDone')
  }

  const severityBucket = (f) => {
    if (f.priority === 'critical' || f.severity === 'willful' || f.severity === 'repeat') return 'critical'
    if (f.severity === 'serious') return 'serious'
    return 'other'
  }
  const sevIdx = new Map(months.map((m, i) => [m, i]))
  const severityByMonth = months.map((mk) => ({
    month: mk, label: monthLabel(mk), critical: 0, serious: 0, other: 0, penalty: 0,
  }))
  for (const f of liveFindings) {
    const i = sevIdx.get(monthKey(f.created_at))
    if (i == null) continue
    severityByMonth[i][severityBucket(f)] += 1
    severityByMonth[i].penalty += Number(f.estimated_penalty) || 0
  }

  const trends = { months, engagement, engagementBySite, severityByMonth }

  return {
    metrics,
    auditActivity,
    leadPipeline,
    geo,
    workflow,
    website,
    actions: actionsDetail,
    detail,
    trends,
    health: raw.health,
    errors: raw.errors,
  }
}

// ---- helpers -------------------------------------------------------------
function groupBy(rows, keyFn) {
  const m = new Map()
  for (const r of rows) {
    const k = keyFn(r)
    if (k == null) continue
    if (!m.has(k)) m.set(k, [])
    m.get(k).push(r)
  }
  return m
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthLabel(mk) {
  const [y, m] = mk.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} '${String(y).slice(2)}`
}

// Consecutive YYYY-MM keys from the earliest date seen through the current
// month, guaranteeing at least `minMonths` buckets so sparse charts have room.
function monthRange(dates, minMonths) {
  const now = new Date()
  let start = new Date(now.getFullYear(), now.getMonth() - (minMonths - 1), 1)
  for (const d of dates) {
    const t = new Date(d)
    if (!isNaN(t) && t < start) start = new Date(t.getFullYear(), t.getMonth(), 1)
  }
  const out = []
  const cur = new Date(start)
  const end = new Date(now.getFullYear(), now.getMonth(), 1)
  while (cur <= end && out.length < 36) {
    out.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`)
    cur.setMonth(cur.getMonth() + 1)
  }
  return out
}

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
