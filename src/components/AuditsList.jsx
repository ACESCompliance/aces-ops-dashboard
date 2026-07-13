import { useState } from 'react'
import { Card, StatusPill } from './ui'
import { href } from '../lib/router'
import { currency, num, pct, shortDate } from '../lib/format'

function scoreColor(s) {
  if (s == null) return 'text-muted'
  if (s >= 85) return 'text-ok'
  if (s >= 70) return 'text-warn'
  return 'text-bad'
}

export default function AuditsList({ audits, sites }) {
  const [siteFilter, setSiteFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const statuses = Array.from(new Set(audits.map((a) => a.status).filter(Boolean)))
  const filtered = audits.filter(
    (a) =>
      (siteFilter === 'all' || a.site_id === siteFilter) &&
      (statusFilter === 'all' || a.status === statusFilter),
  )

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-ink">
          All Audits · {filtered.length}
          {filtered.length !== audits.length && (
            <span className="text-muted"> of {audits.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select className="input w-auto" value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)}>
            <option value="all">All sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-line/60">
              <th className="th">Site</th>
              <th className="th">Title</th>
              <th className="th">Created By</th>
              <th className="th">Date</th>
              <th className="th">Status</th>
              <th className="th text-right">Score</th>
              <th className="th text-right">Findings</th>
              <th className="th text-right">Photos</th>
              <th className="th text-right">Exposure</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr
                key={a.id}
                className="cursor-pointer border-b border-line/30 transition-colors hover:bg-panel2/40"
                onClick={() => (window.location.hash = `/audits/${a.id}`)}
              >
                <td className="td">
                  <a
                    href={href(`sites/${a.site_id}`)}
                    className="font-medium text-ink/90 hover:text-accent"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {a.siteName}
                  </a>
                </td>
                <td className="td">
                  <a
                    href={href(`audits/${a.id}`)}
                    className="font-medium text-accent hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {a.title || 'Untitled audit'}
                  </a>
                </td>
                <td className="td text-muted">{a.creatorName || '—'}</td>
                <td className="td text-muted">{shortDate(a.audit_date || a.created_at)}</td>
                <td className="td"><StatusPill status={a.status} /></td>
                <td className={`td text-right font-semibold ${scoreColor(Number(a.compliance_score))}`}>
                  {a.compliance_score == null ? '—' : pct(Number(a.compliance_score))}
                </td>
                <td className="td text-right">{num(a.findings.length)}</td>
                <td className="td text-right">{num(a.photosMeta.length)}</td>
                <td className="td text-right text-accent">{currency(a.total_penalty_exposure)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="td text-muted" colSpan={9}>No audits match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
