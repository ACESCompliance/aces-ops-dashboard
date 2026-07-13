import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchLeads, STAGES, stageOf, hasEmail } from '../../lib/crm'
import TodaysActions from './TodaysActions'
import Pipeline from './Pipeline'
import LeadTable from './LeadTable'
import LeadDetail from './LeadDetail'

const VIEWS = [
  { key: 'today', label: "Today's Actions" },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'table', label: 'Lead Table' },
]

// Self-contained CRM workspace. Owns its own lead fetch (the CRM columns) so the
// main dashboard payload stays untouched, and keeps the selected lead in sync as
// edits stream back from the detail panel.
export default function CRM() {
  const [leads, setLeads] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [view, setView] = useState('today')
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setLeads(await fetchLeads())
    } catch (e) {
      console.error(e)
      setError(e.message || 'Failed to load CRM leads')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Apply an edited lead in place across the list + the open panel.
  const handleUpdated = useCallback((updated) => {
    setLeads((prev) => (prev ? prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)) : prev))
    setSelected((cur) => (cur && cur.id === updated.id ? { ...cur, ...updated } : cur))
  }, [])

  const stats = useMemo(() => {
    const rows = leads || []
    const counts = Object.fromEntries(STAGES.map((s) => [s.key, 0]))
    let withEmail = 0
    let overdue = 0
    const now = Date.now()
    for (const l of rows) {
      counts[stageOf(l)] = (counts[stageOf(l)] || 0) + 1
      if (hasEmail(l)) withEmail += 1
      if (
        l.next_followup_at &&
        new Date(l.next_followup_at).getTime() <= now &&
        stageOf(l) !== 'client_won' &&
        stageOf(l) !== 'lost' &&
        stageOf(l) !== 'unqualified'
      )
        overdue += 1
    }
    return { total: rows.length, withEmail, overdue, won: counts.client_won || 0 }
  }, [leads])

  return (
    <div className="space-y-5">
      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total Leads" value={stats.total} />
        <Stat label="With Email" value={stats.withEmail} accent="#16A34A" />
        <Stat label="Overdue Follow-ups" value={stats.overdue} accent="#DC2626" />
        <Stat label="Clients Won" value={stats.won} accent="#F07316" />
      </div>

      {/* View switcher + refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-line/60 bg-panel/60 p-1">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === v.key
                  ? 'bg-accent/20 text-accent'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <button onClick={load} disabled={loading} className="btn">
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-bad/40 bg-bad/10 px-4 py-3 text-sm text-bad">
          <strong>Couldn’t load CRM:</strong> {error}
        </div>
      )}

      {!leads && loading && (
        <div className="py-24 text-center text-muted">Loading leads…</div>
      )}

      {leads && (
        <>
          {view === 'today' && <TodaysActions leads={leads} onSelect={setSelected} />}
          {view === 'pipeline' && <Pipeline leads={leads} onSelect={setSelected} />}
          {view === 'table' && <LeadTable leads={leads} onSelect={setSelected} />}
        </>
      )}

      {selected && (
        <LeadDetail
          lead={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  )
}

function Stat({ label, value, accent }) {
  return (
    <div className="card">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-1 text-2xl font-extrabold" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
    </div>
  )
}
