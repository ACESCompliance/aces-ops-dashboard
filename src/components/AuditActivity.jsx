import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { Card, StatusPill } from './ui'
import { currency, num, shortDate, pct } from '../lib/format'

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

export default function AuditActivity({ a }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Summary stats */}
      <Card className="lg:col-span-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted">Penalty Exposure</div>
            <div className="mt-1 text-2xl font-extrabold text-accent">{currency(a.costOfFindings)}</div>
            <div className="text-xs text-muted">across all audits</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted">Avg Score</div>
            <div className={`mt-1 text-2xl font-extrabold ${scoreColor(a.avgScore)}`}>
              {a.avgScore == null ? '—' : pct(a.avgScore)}
            </div>
            <div className="text-xs text-muted">compliance</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted">Findings</div>
            <div className="mt-1 text-2xl font-extrabold text-ink">{num(a.totalFindings)}</div>
            <div className="text-xs text-muted">live (non-dismissed)</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted">Corrective Actions</div>
            <div className="mt-1 text-2xl font-extrabold text-ink">{num(a.actionsTotal)}</div>
            <div className="text-xs text-muted">
              {Object.entries(a.actionStatus)
                .map(([k, v]) => `${v} ${k.replace(/_/g, ' ')}`)
                .join(' · ') || 'none yet'}
            </div>
          </div>
        </div>
      </Card>

      {/* Severity breakdown */}
      <Card>
        <div className="mb-2 text-sm font-semibold text-ink">Findings by Severity</div>
        <div className="flex items-center">
          <div className="h-40 w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={a.severityData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={38}
                  outerRadius={62}
                  paddingAngle={2}
                >
                  {a.severityData.map((d) => (
                    <Cell key={d.name} fill={d.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip {...TT} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-1/2 space-y-2">
            {a.severityData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                  {d.name}
                </span>
                <span className="font-semibold text-ink">{num(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Findings trend */}
      <Card>
        <div className="mb-2 text-sm font-semibold text-ink">Findings · last 30 days</div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={a.findingsTrend} margin={{ top: 5, right: 5, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="findGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F07316" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#F07316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#22436b" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 10 }} interval={6} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} allowDecimals={false} width={28} />
              <Tooltip {...TT} />
              <Area type="monotone" dataKey="count" stroke="#F07316" strokeWidth={2} fill="url(#findGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Recent audits table */}
      <Card className="lg:col-span-3">
        <div className="mb-3 text-sm font-semibold text-ink">Recent Audits</div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-line/60">
                <th className="th">Site</th>
                <th className="th">Title</th>
                <th className="th">Date</th>
                <th className="th">Status</th>
                <th className="th text-right">Score</th>
                <th className="th text-right">Findings</th>
                <th className="th text-right">Exposure</th>
              </tr>
            </thead>
            <tbody>
              {a.recentAudits.map((au) => (
                <tr key={au.id} className="border-b border-line/30 hover:bg-panel2/40">
                  <td className="td font-medium">{au.siteName}</td>
                  <td className="td text-muted">{au.title}</td>
                  <td className="td text-muted">{shortDate(au.audit_date || au.created_at)}</td>
                  <td className="td"><StatusPill status={au.status} /></td>
                  <td className={`td text-right font-semibold ${scoreColor(Number(au.compliance_score))}`}>
                    {au.compliance_score == null ? '—' : pct(Number(au.compliance_score))}
                  </td>
                  <td className="td text-right">{num(au.total_findings)}</td>
                  <td className="td text-right text-accent">{currency(au.total_penalty_exposure)}</td>
                </tr>
              ))}
              {a.recentAudits.length === 0 && (
                <tr>
                  <td className="td text-muted" colSpan={7}>No audits yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
