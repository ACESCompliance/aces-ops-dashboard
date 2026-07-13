import { Card, Bar } from './ui'
import { num } from '../lib/format'

function StateList({ title, rows, color, empty }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <Card>
      <div className="mb-3 text-sm font-semibold text-ink">{title}</div>
      <div className="space-y-2">
        {rows.slice(0, 10).map((r) => (
          <div key={r.key} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-sm font-semibold text-ink">{r.key}</span>
            <div className="flex-1">
              <Bar value={r.count} max={max} color={color} />
            </div>
            <span className="w-10 shrink-0 text-right text-sm text-muted">{num(r.count)}</span>
          </div>
        ))}
        {rows.length === 0 && <div className="text-sm text-muted">{empty}</div>}
      </div>
    </Card>
  )
}

export default function GeoBreakdown({ geo }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <StateList
        title="Audit Sites by State"
        rows={geo.siteStates}
        color="#60A5FA"
        empty="No sites yet."
      />
      <StateList
        title="Leads by State"
        rows={geo.leadStates}
        color="#F07316"
        empty="No leads yet."
      />
      <Card>
        <div className="mb-3 text-sm font-semibold text-ink">Top Lead Cities</div>
        <div className="space-y-1.5">
          {geo.leadCities.map((c) => (
            <div key={c.key} className="flex items-center justify-between text-sm">
              <span className="text-ink/90">{c.key}</span>
              <span className="font-semibold text-muted">{num(c.count)}</span>
            </div>
          ))}
          {geo.leadCities.length === 0 && <div className="text-sm text-muted">No leads yet.</div>}
        </div>
      </Card>
    </div>
  )
}
