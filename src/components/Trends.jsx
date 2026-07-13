import { useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import { Card } from './ui'
import { currency, num } from '../lib/format'

const TT = {
  contentStyle: {
    background: '#0B1D32',
    border: '1px solid #22436b',
    borderRadius: 8,
    color: '#F1F5F9',
    fontSize: 12,
  },
}

const AXIS = { fill: '#94A3B8', fontSize: 10 }
const LEGEND = { fontSize: 12, color: '#94A3B8' }

// Series colors validated for CVD separation + contrast on the panel surface.
const ENGAGEMENT_SERIES = [
  { key: 'audits', label: 'Audits created', color: '#E35F00' },
  { key: 'photos', label: 'Photos uploaded', color: '#3B82F6' },
  { key: 'actionsDone', label: 'Actions completed', color: '#16A34A' },
]
const SEVERITY_SERIES = [
  { key: 'critical', label: 'Critical', color: '#DC2626' },
  { key: 'serious', label: 'Serious', color: '#E35F00' },
  { key: 'other', label: 'Other', color: '#3B82F6' },
]

export default function Trends({ trends, sites }) {
  const [siteFilter, setSiteFilter] = useState('all')

  const siteNames = Object.keys(trends.engagementBySite).sort()
  const engagement =
    siteFilter === 'all' ? trends.engagement : trends.engagementBySite[siteFilter] || []

  const engagementTotal = engagement.reduce(
    (t, r) => t + r.audits + r.photos + r.actionsDone,
    0,
  )
  const severityTotal = trends.severityByMonth.reduce(
    (t, r) => t + r.critical + r.serious + r.other,
    0,
  )
  const activeSitesCount = sites.filter((s) => s.auditCount > 0).length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted">
          {num(activeSitesCount)} of {num(sites.length)} sites have audit activity — every
          audit run adds a data point here.
        </div>
        <select className="input w-auto" value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)}>
          <option value="all">All sites</option>
          {siteNames.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      {/* Pilot engagement */}
      <Card>
        <div className="mb-1 text-sm font-semibold text-ink">Pilot Engagement · monthly</div>
        <div className="mb-3 text-xs text-muted">
          Who's actually using the app — audits run, photos analyzed, corrective actions closed.
        </div>
        {engagementTotal > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={engagement} margin={{ top: 5, right: 5, left: -18, bottom: 0 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#22436b" vertical={false} />
                <XAxis dataKey="label" tick={AXIS} />
                <YAxis allowDecimals={false} tick={AXIS} width={32} />
                <Tooltip {...TT} cursor={{ fill: 'rgba(34,67,107,0.25)' }} />
                <Legend wrapperStyle={LEGEND} />
                {ENGAGEMENT_SERIES.map((s) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.label}
                    fill={s.color}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center text-sm text-muted">
            No engagement recorded yet{siteFilter !== 'all' ? ` for ${siteFilter}` : ''} — this
            fills in as pilots run audits.
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Findings mix */}
        <Card>
          <div className="mb-1 text-sm font-semibold text-ink">Findings by Severity · monthly</div>
          <div className="mb-3 text-xs text-muted">
            Live (non-dismissed) findings across all sites, by month found.
          </div>
          {severityTotal > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends.severityByMonth} margin={{ top: 5, right: 5, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#22436b" vertical={false} />
                  <XAxis dataKey="label" tick={AXIS} />
                  <YAxis allowDecimals={false} tick={AXIS} width={40} />
                  <Tooltip {...TT} cursor={{ fill: 'rgba(34,67,107,0.25)' }} />
                  <Legend wrapperStyle={LEGEND} />
                  {SEVERITY_SERIES.map((s) => (
                    <Bar
                      key={s.key}
                      dataKey={s.key}
                      name={s.label}
                      stackId="sev"
                      fill={s.color}
                      stroke="#0B1D32"
                      strokeWidth={2}
                      maxBarSize={36}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-muted">
              No findings yet.
            </div>
          )}
        </Card>

        {/* Penalty exposure */}
        <Card>
          <div className="mb-1 text-sm font-semibold text-ink">Penalty Exposure · monthly</div>
          <div className="mb-3 text-xs text-muted">
            Estimated OSHA penalty exposure from findings identified each month.
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends.severityByMonth} margin={{ top: 5, right: 5, left: -4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#22436b" vertical={false} />
                <XAxis dataKey="label" tick={AXIS} />
                <YAxis tick={AXIS} width={52} tickFormatter={(v) => currency(v)} />
                <Tooltip {...TT} formatter={(v) => [currency(v), 'Exposure']} />
                {/* Linear (not smoothed) — with sparse monthly data a curved
                    interpolation invents a rise-and-fall that isn't there. */}
                <Line
                  type="linear"
                  dataKey="penalty"
                  stroke="#E35F00"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#E35F00', stroke: '#0B1D32', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  )
}
