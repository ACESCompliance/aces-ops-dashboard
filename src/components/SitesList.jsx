import { Card, StatusPill } from './ui'
import { href } from '../lib/router'
import { num, pct, shortDate, titleize } from '../lib/format'

function scoreColor(s) {
  if (s == null) return 'text-muted'
  if (s >= 85) return 'text-ok'
  if (s >= 70) return 'text-warn'
  return 'text-bad'
}

// Every site — including ones with zero audits — with its owner surfaced.
export default function SitesList({ sites }) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-ink">All Sites · {sites.length}</div>
        <div className="text-xs text-muted">click a site for its full profile</div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-line/60">
              <th className="th">Site</th>
              <th className="th">Company</th>
              <th className="th">Owner</th>
              <th className="th">Location</th>
              <th className="th">Plan</th>
              <th className="th text-right">Audits</th>
              <th className="th text-right">Latest Score</th>
              <th className="th text-right">Last Audit</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((s) => (
              <tr
                key={s.id}
                className="cursor-pointer border-b border-line/30 transition-colors hover:bg-panel2/40"
                onClick={() => (window.location.hash = `/sites/${s.id}`)}
              >
                <td className="td">
                  <a href={href(`sites/${s.id}`)} className="font-semibold text-accent hover:underline" onClick={(e) => e.stopPropagation()}>
                    {s.name}
                  </a>
                </td>
                <td className="td text-muted">{s.company_name || '—'}</td>
                <td className="td">
                  <div className="text-ink/90">{s.owner?.name || '—'}</div>
                  <div className="text-xs text-muted">{s.owner?.email || ''}</div>
                </td>
                <td className="td text-muted">
                  {[s.city, s.state].filter(Boolean).join(', ') || '—'}
                </td>
                <td className="td">
                  <StatusPill status={s.subscription_status} />{' '}
                  <span className="text-xs text-muted">{titleize(s.subscription_tier)}</span>
                </td>
                <td className="td text-right">
                  {num(s.auditCount)}
                  {s.auditCount === 0 && <span className="ml-1 text-xs text-muted">none yet</span>}
                </td>
                <td className={`td text-right font-semibold ${scoreColor(s.latestScore)}`}>
                  {s.latestScore == null ? '—' : pct(s.latestScore)}
                </td>
                <td className="td text-right text-muted">{shortDate(s.latestAuditDate)}</td>
              </tr>
            ))}
            {sites.length === 0 && (
              <tr>
                <td className="td text-muted" colSpan={8}>No sites yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
