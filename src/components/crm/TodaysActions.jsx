import { leadName, hasDraft, stageOf, messageStep, STAGE_BY_KEY, CLOSED_STAGES } from '../../lib/crm'
import { shortDate, daysSince } from '../../lib/format'

// Two action lists: follow-ups that are due/overdue, and captured contacts with
// a drafted first message that Nour has not sent yet. Daily target: 10 sends.
export default function TodaysActions({ leads, onSelect }) {
  const now = Date.now()

  const overdue = leads
    .filter((l) => {
      const t = l.next_followup_at ? new Date(l.next_followup_at).getTime() : NaN
      return !isNaN(t) && t <= now && !CLOSED_STAGES.has(stageOf(l))
    })
    .sort((a, b) => new Date(a.next_followup_at) - new Date(b.next_followup_at))

  // Warm contacts first, then by capture date.
  const ready = leads
    .filter((l) => stageOf(l) === 'captured' && !l.last_contacted_at && hasDraft(l))
    .sort((a, b) => {
      const w = (x) => (x.warm_or_cold === 'warm' ? 0 : 1)
      return w(a) - w(b) || new Date(a.created_at || 0) - new Date(b.created_at || 0)
    })
    .slice(0, 30)

  const needsDraft = leads.filter(
    (l) => stageOf(l) === 'captured' && !l.last_contacted_at && !hasDraft(l),
  ).length

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ActionCard
        title="Follow-ups Due"
        count={overdue.length}
        accent="#DC2626"
        empty="No follow-ups due. You're all caught up. 🎉"
      >
        {overdue.slice(0, 25).map((l) => {
          const od = daysSince(l.next_followup_at)
          return (
            <Row key={l.id} lead={l} onSelect={onSelect}>
              <span className="text-right">
                <span className="block whitespace-nowrap text-xs font-semibold text-bad">
                  {od > 0 ? `${od}d overdue` : 'due today'}
                </span>
                <span className="block whitespace-nowrap text-[11px] text-muted">
                  {messageStep(l).title}
                  {hasDraft(l) ? ' · drafted' : ' · awaiting draft'}
                </span>
              </span>
            </Row>
          )
        })}
      </ActionCard>

      <ActionCard
        title="Ready to Send · Today's 10"
        count={ready.length}
        accent="#16A34A"
        empty={
          needsDraft > 0
            ? `${needsDraft} captured contact${needsDraft === 1 ? '' : 's'} waiting on a draft from the lead agent.`
            : 'Nothing drafted. Capture more contacts or wait for the morning lead run.'
        }
      >
        {ready.map((l) => (
          <Row key={l.id} lead={l} onSelect={onSelect}>
            <span
              className="whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{
                backgroundColor: l.warm_or_cold === 'warm' ? '#F0731622' : '#64748B22',
                color: l.warm_or_cold === 'warm' ? '#F07316' : '#94A3B8',
              }}
            >
              {l.warm_or_cold === 'warm' ? 'warm' : 'cold'}
            </span>
          </Row>
        ))}
      </ActionCard>
    </div>
  )
}

function ActionCard({ title, count, accent, empty, children }) {
  const hasItems = Array.isArray(children) ? children.length > 0 : Boolean(children)
  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-ink">{title}</div>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-bold"
          style={{ backgroundColor: `${accent}22`, color: accent }}
        >
          {count}
        </span>
      </div>
      {hasItems ? (
        <div className="max-h-80 space-y-1 overflow-y-auto pr-1">{children}</div>
      ) : (
        <div className="py-8 text-center text-sm text-muted">{empty}</div>
      )}
    </div>
  )
}

function Row({ lead, onSelect, children }) {
  const name = leadName(lead)
  const stage = STAGE_BY_KEY[stageOf(lead)]
  return (
    <button
      onClick={() => onSelect(lead)}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-line/40 bg-panel2/30 px-3 py-2 text-left transition-colors hover:border-accent/50 hover:bg-panel2/60"
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-ink">{lead.business_name}</div>
        <div className="truncate text-xs text-muted">
          {[name || null, lead.city].filter(Boolean).join(' · ') || '—'}
          {stage && (
            <span className="ml-2" style={{ color: stage.color }}>
              {stage.label}
            </span>
          )}
        </div>
      </div>
      {children}
    </button>
  )
}
