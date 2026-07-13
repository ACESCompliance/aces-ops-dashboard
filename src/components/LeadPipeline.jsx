import {
  ResponsiveContainer,
  BarChart,
  Bar as RBar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { Card, Bar } from './ui'
import { num, titleize, shortDate } from '../lib/format'

const TT = {
  contentStyle: {
    background: '#0B1D32',
    border: '1px solid #22436b',
    borderRadius: 8,
    color: '#F1F5F9',
    fontSize: 12,
  },
  cursor: { fill: 'rgba(240,115,22,0.08)' },
}

const QUALITY_COLORS = {
  apollo_verified: '#16A34A',
  hunter_verified: '#22C55E',
  verified_subpage: '#60A5FA',
  generic: '#F59E0B',
  domain_mismatch: '#F97316',
  wrong_role: '#EAB308',
  no_email_found: '#64748B',
  no_website: '#475569',
  unknown: '#334155',
}

function Breakdown({ title, rows, colorFor }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-ink">{title}</div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.key}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-ink/90">{titleize(r.key)}</span>
              <span className="font-semibold text-muted">{num(r.count)}</span>
            </div>
            <Bar value={r.count} max={max} color={colorFor ? colorFor(r.key) : '#F07316'} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LeadPipeline({ p }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted">Compliance Leads</div>
            <div className="mt-1 text-2xl font-extrabold text-accent">{num(p.total)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted">Digital Leads</div>
            <div className="mt-1 text-2xl font-extrabold text-ink">{num(p.digital)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted">Added · 7 days</div>
            <div className="mt-1 text-2xl font-extrabold text-ok">{num(p.recentCount)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted">Mid-Market</div>
            <div className="mt-1 text-2xl font-extrabold text-ink">{num(p.byTier.mid_market || 0)}</div>
            <div className="text-xs text-muted">
              {num(p.byTier.enterprise_review || 0)} enterprise
            </div>
          </div>
        </div>
        <div className="mt-4 border-t border-line/40 pt-4">
          <Breakdown title="By Status" rows={p.byStatus} />
        </div>
      </Card>

      <Card>
        <Breakdown
          title="By Email Quality"
          rows={p.byEmailQuality}
          colorFor={(k) => QUALITY_COLORS[k] || '#F07316'}
        />
      </Card>

      <Card>
        <div className="mb-2 text-sm font-semibold text-ink">Leads Added · last 30 days</div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={p.leadsTrend} margin={{ top: 5, right: 5, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#22436b" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 10 }} interval={6} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} allowDecimals={false} width={28} />
              <Tooltip {...TT} />
              <RBar dataKey="count" fill="#F07316" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="lg:col-span-3">
        <div className="mb-3 text-sm font-semibold text-ink">Recently Added Leads</div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-line/60">
                <th className="th">Business</th>
                <th className="th">Type</th>
                <th className="th">Location</th>
                <th className="th">Contact</th>
                <th className="th">Email</th>
                <th className="th">Tier</th>
                <th className="th">Added</th>
              </tr>
            </thead>
            <tbody>
              {p.recentLeads.map((l) => (
                <tr key={l.id} className="border-b border-line/30 hover:bg-panel2/40">
                  <td className="td font-medium">{l.business_name}</td>
                  <td className="td text-muted">{titleize(l.business_type)}</td>
                  <td className="td text-muted">
                    {[l.city, l.state].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="td text-muted">{l.contact_name || '—'}</td>
                  <td className="td">
                    {l.contact_email ? (
                      <span className="text-accent2">{l.contact_email}</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="td text-muted">{titleize(l.lead_tier)}</td>
                  <td className="td text-muted">{shortDate(l.created_at)}</td>
                </tr>
              ))}
              {p.recentLeads.length === 0 && (
                <tr>
                  <td className="td text-muted" colSpan={7}>No leads added in the last 7 days.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
