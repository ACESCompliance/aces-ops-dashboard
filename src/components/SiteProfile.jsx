import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { Card, StatCard, StatusPill } from './ui'
import { href } from '../lib/router'
import { currency, num, pct, shortDate, titleize } from '../lib/format'

const TT = {
  contentStyle: {
    background: '#0B1D32',
    border: '1px solid #22436b',
    borderRadius: 8,
    color: '#F1F5F9',
    fontSize: 12,
  },
}

function scoreColor(s) {
  if (s == null) return 'text-muted'
  if (s >= 85) return 'text-ok'
  if (s >= 70) return 'text-warn'
  return 'text-bad'
}

export default function SiteProfile({ site }) {
  if (!site) {
    return (
      <Card>
        <div className="text-sm text-muted">
          Site not found. <a className="text-accent hover:underline" href={href('sites')}>Back to all sites</a>
        </div>
      </Card>
    )
  }

  const openActions = (site.actions || []).filter(
    (a) => a.status !== 'completed' && a.status !== 'cancelled',
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <a className="text-xs font-semibold text-muted hover:text-accent" href={href('sites')}>
          ← All sites
        </a>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">{site.name}</h1>
            <div className="mt-1 text-sm text-muted">
              {site.company_name}
              {site.address ? ` · ${site.address}` : ''}
              {[site.city, site.state, site.zip].filter(Boolean).length
                ? ` · ${[site.city, site.state, site.zip].filter(Boolean).join(', ')}`
                : ''}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <StatusPill status={site.subscription_status} />
            <span className="text-muted">{titleize(site.subscription_tier)} plan</span>
            {site.trial_ends_at && (
              <span className="text-xs text-warn">trial ends {shortDate(site.trial_ends_at)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Audits" value={num(site.auditCount)} sub={`${num(site.completedAudits)} complete`} accent />
        <StatCard
          label="Latest Score"
          value={site.latestScore == null ? '—' : pct(site.latestScore)}
          sub={site.latestAuditDate ? `on ${shortDate(site.latestAuditDate)}` : 'no audits yet'}
        />
        <StatCard label="Findings" value={num(site.findingsCount)} sub={`${currency(site.penaltyExposure)} exposure`} />
        <StatCard label="Open Actions" value={num(site.openActionsCount)} sub={`${num((site.actions || []).length)} total`} />
        <StatCard
          label="Photos"
          value={num(site.photosCount)}
          sub={`${num(site.photos_used_this_month || 0)} this month`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Team */}
        <Card>
          <div className="mb-3 text-sm font-semibold text-ink">Team</div>
          <div className="space-y-3">
            {(site.members || []).map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-ink/90">{m.name}</div>
                  <div className="text-xs text-muted">{m.email}</div>
                </div>
                <div className="text-right">
                  <span className={`pill ${m.role === 'owner' ? 'bg-accent/15 text-accent' : 'bg-muted/15 text-muted'}`}>
                    {m.role}
                  </span>
                  <div className="mt-0.5 text-[10px] text-muted">joined {shortDate(m.joined_at)}</div>
                </div>
              </div>
            ))}
            {(site.members || []).length === 0 && (
              <div className="text-sm text-muted">No members.</div>
            )}
          </div>
          <div className="mt-4 border-t border-line/40 pt-3 text-xs text-muted">
            {site.site_type ? `${titleize(site.site_type)} · ` : ''}
            {site.square_footage ? `${num(site.square_footage)} sq ft · ` : ''}
            {site.employee_count ? `${num(site.employee_count)} employees · ` : ''}
            site since {shortDate(site.created_at)}
          </div>
        </Card>

        {/* Score trend */}
        <Card className="lg:col-span-2">
          <div className="mb-2 text-sm font-semibold text-ink">Compliance Score Trend</div>
          {site.scoreTrend.length >= 2 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={site.scoreTrend} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#22436b" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => shortDate(d)}
                    tick={{ fill: '#94A3B8', fontSize: 10 }}
                  />
                  <YAxis domain={[0, 100]} tick={{ fill: '#94A3B8', fontSize: 10 }} width={32} />
                  <Tooltip
                    {...TT}
                    labelFormatter={(d) => shortDate(d)}
                    formatter={(v) => [`${v}%`, 'Score']}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#E35F00"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#E35F00', stroke: '#0B1D32', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-muted">
              {site.scoreTrend.length === 1
                ? `One scored audit so far (${pct(site.scoreTrend[0].score)}) — the trend line starts with the second.`
                : 'No scored audits yet — the trend appears once audits complete.'}
            </div>
          )}
        </Card>
      </div>

      {/* Audit history */}
      <Card>
        <div className="mb-3 text-sm font-semibold text-ink">Audit History</div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-line/60">
                <th className="th">Title</th>
                <th className="th">Date</th>
                <th className="th">Status</th>
                <th className="th text-right">Score</th>
                <th className="th text-right">Findings</th>
                <th className="th text-right">Exposure</th>
              </tr>
            </thead>
            <tbody>
              {site.audits.map((a) => (
                <tr
                  key={a.id}
                  className="cursor-pointer border-b border-line/30 transition-colors hover:bg-panel2/40"
                  onClick={() => (window.location.hash = `/audits/${a.id}`)}
                >
                  <td className="td">
                    <a
                      href={href(`audits/${a.id}`)}
                      className="font-medium text-accent hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {a.title || 'Untitled audit'}
                    </a>
                  </td>
                  <td className="td text-muted">{shortDate(a.audit_date || a.created_at)}</td>
                  <td className="td"><StatusPill status={a.status} /></td>
                  <td className={`td text-right font-semibold ${scoreColor(Number(a.compliance_score))}`}>
                    {a.compliance_score == null ? '—' : pct(Number(a.compliance_score))}
                  </td>
                  <td className="td text-right">{num(a.total_findings)}</td>
                  <td className="td text-right text-accent">{currency(a.total_penalty_exposure)}</td>
                </tr>
              ))}
              {site.audits.length === 0 && (
                <tr>
                  <td className="td text-muted" colSpan={6}>
                    No audits yet — this site hasn't run one. It still counts toward Active Sites.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Open actions */}
      {openActions.length > 0 && (
        <Card>
          <div className="mb-3 text-sm font-semibold text-ink">Open Corrective Actions</div>
          <div className="space-y-2">
            {openActions.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-line/40 px-3 py-2">
                <div>
                  <div className="text-sm font-medium text-ink/90">{a.title}</div>
                  <div className="text-xs text-muted">
                    {a.assigned_to_name ? `assigned to ${a.assigned_to_name}` : 'unassigned'}
                    {a.due_date ? ` · due ${shortDate(a.due_date)}` : ''}
                  </div>
                </div>
                <StatusPill status={a.status} />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
