import { leadName, hasEmail, stageOf, STAGE_BY_KEY } from '../../lib/crm'
import { shortDate, daysSince } from '../../lib/format'

// Two action lists: follow-ups that are due/overdue, and email-reachable leads
// that have never been contacted. Both are the founder's "do this now" queue.
export default function TodaysActions({ leads, onSelect }) {
  const now = Date.now()

  const overdue = leads
    .filter((l) => {
      const t = l.next_followup_at ? new Date(l.next_followup_at).getTime() : NaN
      return (
        !isNaN(t) &&
        t <= now &&
        stageOf(l) !== 'client_won' &&
        stageOf(l) !== 'lost' &&
        stageOf(l) !== 'unqualified'
      )
    })
    .sort((a, b) => new Date(a.next_followup_at) - new Date(b.next_followup_at))

  const uncontacted = leads
    .filter(
      (l) =>
        hasEmail(l) &&
        !l.last_contacted_at &&
        stageOf(l) === 'new_lead' &&
        !(Number(l.interaction_count) > 0),
    )
    .slice(0, 30)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ActionCard
        title="Overdue Follow-ups"
        count={overdue.length}
        accent="#DC2626"
        empty="No follow-ups due. You're all caught up. 🎉"
      >
        {overdue.slice(0, 25).map((l) => {
          const od = daysSince(l.next_followup_at)
          return (
            <Row key={l.id} lead={l} onSelect={onSelect}>
              <span className="whitespace-nowrap text-xs font-semibold text-bad">
                {od > 0 ? `${od}d overdue` : 'due today'}
              </span>
            </Row>
          )
        })}
      </ActionCard>

      <ActionCard
        title="Emails · Never Contacted"
        count={uncontacted.length}
        accent="#16A34A"
        empty="Every reachable lead has been touched."
      >
        {uncontacted.map((l) => (
          <Row key={l.id} lead={l} onSelect={onSelect}>
            <span className="max-w-[40%] truncate text-xs text-accent2" title={l.contact_email}>
              {l.contact_email}
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
