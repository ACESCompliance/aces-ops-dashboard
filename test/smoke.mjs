import { derive } from '../src/lib/derive.js'
import { payload } from './fixture.mjs'

const d = derive(payload)
const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); process.exitCode = 1 } else console.log('ok:', msg) }

assert(d.detail.sites.length === 2, '2 sites in detail')
const seatac = d.detail.sites.find(s => s.name === 'Seatac')
assert(seatac && seatac.auditCount === 0, 'Seatac present with 0 audits')
assert(seatac.owner?.email === 'brian.mountain@yahoo.com', 'Seatac owner is Brian')
const ocala = d.detail.sites.find(s => s.name === 'Ocala MFG/DC')
assert(ocala.owner?.name === 'Jessica Torino', 'Ocala owner is Jessica')
assert(ocala.latestScore === 71, 'Ocala latest score 71')
assert(ocala.findingsCount === 10, 'Ocala findings 10')
assert(ocala.photosCount === 1, 'Ocala photos 1')
const audit = d.detail.audits[0]
assert(audit.creatorName === 'Jessica Torino', 'audit creator joined')
assert(audit.findings.length === 10, 'audit findings joined')
assert(audit.photosMeta.length === 1, 'audit photos meta joined')
assert(d.trends.months.length >= 3, 'at least 3 month buckets: ' + d.trends.months.join(','))
const jun = d.trends.engagement.find(r => r.month === '2026-06')
assert(jun && jun.audits === 1 && jun.photos === 1, 'June engagement: 1 audit, 1 photo')
const junSev = d.trends.severityByMonth.find(r => r.month === '2026-06')
assert(junSev.critical === 1 && junSev.serious === 5 && junSev.other === 4, `June severity 1/5/4 got ${junSev.critical}/${junSev.serious}/${junSev.other}`)
assert(junSev.penalty === 115282 - 16131 + 16131, 'June penalty sums: ' + junSev.penalty)
assert(Object.keys(d.trends.engagementBySite).includes('Ocala MFG/DC'), 'per-site engagement keyed by name')
assert(d.metrics.activeSites === 2, 'metrics still work')
console.log('\nmonths:', d.trends.months.join(', '))
console.log('engagement June:', JSON.stringify(jun))
