import { STAGES, stageOf, leadName, hasEmail, completeness } from '../../lib/crm'

// Kanban-style board: one column per pipeline stage, leads as cards.
export default function Pipeline({ leads, onSelect }) {
  const byStage = {}
  for (const s of STAGES) byStage[s.key] = []
  for (const l of leads) {
    const k = stageOf(l)
    ;(byStage[k] || (byStage[k] = [])).push(l)
  }
  for (const k of Object.keys(byStage)) {
    byStage[k].sort((a, b) => completeness(b) - completeness(a))
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-3">
      {STAGES.map((s) => {
        const col = byStage[s.key] || []
        return (
          <div key={s.key} className="flex w-72 shrink-0 flex-col">
            <div className="mb-2 flex items-center justify-between rounded-lg border border-line/50 bg-panel2/50 px-3 py-2">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-sm font-semibold text-ink">{s.label}</span>
              </div>
              <span className="text-xs font-bold text-muted">{col.length}</span>
            </div>
            <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {col.slice(0, 60).map((l) => (
                <LeadCard key={l.id} lead={l} accent={s.color} onSelect={onSelect} />
              ))}
              {col.length === 0 && (
                <div className="rounded-lg border border-dashed border-line/40 py-6 text-center text-xs text-muted">
                  No leads
                </div>
              )}
              {col.length > 60 && (
                <div className="py-1 text-center text-xs text-muted">
                  +{col.length - 60} more
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LeadCard({ lead, accent, onSelect }) {
  const name = leadName(lead)
  const email = hasEmail(lead)
  return (
    <button
      onClick={() => onSelect(lead)}
      className="w-full rounded-lg border border-line/50 bg-panel/80 p-3 text-left transition-colors hover:border-accent/60 hover:bg-panel2/50"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="truncate text-sm font-semibold text-ink">{lead.business_name}</div>
        <span
          className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: email ? '#16A34A' : '#475569' }}
          title={email ? 'Has email' : 'No email'}
        />
      </div>
      <div className="mt-1 truncate text-xs text-muted">{lead.city || '—'}</div>
      {name && <div className="mt-0.5 truncate text-xs text-accent2/90">{name}</div>}
    </button>
  )
}
