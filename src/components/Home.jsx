import { useEffect, useMemo, useState } from 'react'
import { fetchLeads, fetchSummary, stageOf, hasDraft, STAGES } from '../lib/crm'
import { SectionHeader } from './ui'
import { href } from '../lib/router'

// v2 Home (Oct 2026): the AI-adoption practice at a glance. Everything here is
// derived from the CRM table + activity log. Daily target: 10 messages sent by
// Nour himself. Kill criteria are the dated market signals from the Oct 14 memo.

const WEEKLY_SEND_TARGET = 50 // 10 a day, five days

const KILL_CRITERIA = [
  {
    date: '2026-11-30',
    label: 'Nov 30, 2026',
    goals: [
      { key: 'sendsAll', target: 10, label: 'messages sent' },
      { key: 'sessions', target: 3, label: 'discovery sessions held' },
    ],
    miss: 'Execution, not market. Sales becomes the only task.',
  },
  {
    date: '2027-01-15',
    label: 'Jan 15, 2027',
    goals: [
      { key: 'sessions', target: 8, label: 'sessions held' },
      { key: 'proposals', target: 3, label: 'paid proposals out' },
      { key: 'won', target: 1, label: 'paid engagement' },
    ],
    miss: 'Sessions but no proposals: fix the message. Proposals but no sale: fix price or segment.',
  },
  {
    date: '2027-04-14',
    label: 'Apr 14, 2027',
    goals: [
      { key: 'revenue', target: 10000, label: 'cumulative revenue ($)' },
      { key: 'won', target: 1, label: 'client asking for follow-on' },
    ],
    miss: 'Run the lane-two test (PE home-services platforms).',
  },
  {
    date: '2027-10-14',
    label: 'Oct 14, 2027',
    goals: [{ key: 'revenue', target: 30000, label: 'trailing-12-month revenue ($)' }],
    miss: 'Stop. Do not reinvent the offer a fourth time.',
  },
]

const FUNNEL = ['captured', 'messaged', 'replied', 'session_held', 'proposal_sent', 'won']

export default function Home() {
  const [leads, setLeads] = useState(null)
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let live = true
    Promise.all([fetchLeads(), fetchSummary()])
      .then(([l, s]) => {
        if (!live) return
        setLeads(l)
        setSummary(s)
      })
      .catch((e) => live && setError(e.message || 'Failed to load'))
    return () => {
      live = false
    }
  }, [])

  const m = useMemo(() => {
    const rows = (leads || []).filter((l) => stageOf(l) !== 'archived_v1')
    const count = (pred) => rows.filter(pred).length
    const atOrPast = (keys) => count((l) => keys.includes(stageOf(l)))
    const stageCounts = Object.fromEntries(FUNNEL.map((k) => [k, count((l) => stageOf(l) === k)]))
    const sessions = atOrPast(['session_held', 'proposal_sent', 'won'])
    const proposals = atOrPast(['proposal_sent', 'won'])
    const won = stageCounts.won
    const revenue = rows
      .filter((l) => stageOf(l) === 'won')
      .reduce((a, l) => a + (Number(l.deal_value_usd) || 0), 0)
    const now = Date.now()
    const overdue = count(
      (l) =>
        l.next_followup_at &&
        new Date(l.next_followup_at).getTime() <= now &&
        !['won', 'lost', 'unqualified'].includes(stageOf(l)),
    )
    const ready = count((l) => stageOf(l) === 'captured' && hasDraft(l) && !l.last_contacted_at)
    const warm = count((l) => l.warm_or_cold === 'warm')
    return {
      active: rows.length,
      stageCounts,
      sessions,
      proposals,
      won,
      revenue,
      overdue,
      ready,
      warm,
      sends7d: summary?.sends7d ?? 0,
      sends30d: summary?.sends30d ?? 0,
      sendsAll: summary?.sendsAll ?? 0,
    }
  }, [leads, summary])

  if (error)
    return (
      <div className="rounded-lg border border-bad/40 bg-bad/10 px-4 py-3 text-sm text-bad">
        <strong>Couldn’t load:</strong> {error}
      </div>
    )
  if (!leads) return <div className="py-24 text-center text-muted">Loading…</div>

  const sendPct = Math.min(100, Math.round((m.sends7d / WEEKLY_SEND_TARGET) * 100))

  return (
    <div className="space-y-8">
      {/* This week */}
      <section>
        <SectionHeader>This Week</SectionHeader>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Tile label="Messages sent · 7d" value={m.sends7d} sub={`target ${WEEKLY_SEND_TARGET} (10 a day)`} accent="#F07316" to="crm" />
          <Tile label="Ready to send" value={m.ready} sub="drafted, not yet sent" accent="#16A34A" to="crm" />
          <Tile label="Overdue follow-ups" value={m.overdue} sub="due today or earlier" accent="#DC2626" to="crm" />
          <Tile label="Active contacts" value={m.active} sub={`${m.warm} warm`} to="crm" />
        </div>
        <div className="card mt-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-wider text-muted">Weekly send target</span>
            <span className="text-muted">
              {m.sends7d} / {WEEKLY_SEND_TARGET}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-panel2">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${sendPct}%` }} />
          </div>
          <div className="mt-2 text-[11px] text-muted">
            Counts email, LinkedIn and call activities you log. Outreach first, content second.
          </div>
        </div>
      </section>

      {/* Funnel */}
      <section>
        <SectionHeader>Pipeline</SectionHeader>
        <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
          {FUNNEL.map((k) => {
            const s = STAGES.find((x) => x.key === k)
            return (
              <a key={k} href={href('crm')} className="card no-underline">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">{s.label}</div>
                <div className="mt-1 text-2xl font-extrabold" style={{ color: s.color }}>
                  {m.stageCounts[k]}
                </div>
              </a>
            )
          })}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Tile label="Sessions held" value={m.sessions} sub="at or past Session Held" accent="#A855F7" />
          <Tile label="Proposals out" value={m.proposals} sub="at or past Proposal Sent" accent="#F59E0B" />
          <Tile label="Won" value={m.won} accent="#16A34A" />
          <Tile label="Revenue" value={`$${m.revenue.toLocaleString()}`} sub="deal value on won rows" accent="#16A34A" />
        </div>
      </section>

      {/* Kill criteria */}
      <section>
        <SectionHeader>Checkpoints</SectionHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {KILL_CRITERIA.map((kc) => {
            const daysLeft = Math.ceil((new Date(kc.date).getTime() - Date.now()) / 86400000)
            const results = kc.goals.map((g) => ({ ...g, actual: m[g.key] ?? 0 }))
            const allMet = results.every((g) => g.actual >= g.target)
            const past = daysLeft < 0
            const color = allMet ? '#16A34A' : past ? '#DC2626' : '#F59E0B'
            return (
              <div key={kc.date} className="card">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-semibold text-ink">{kc.label}</div>
                  <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ backgroundColor: `${color}22`, color }}>
                    {allMet ? 'met' : past ? 'missed' : `${daysLeft}d left`}
                  </span>
                </div>
                <ul className="space-y-1">
                  {results.map((g) => (
                    <li key={g.key + g.label} className="flex items-center justify-between text-sm">
                      <span className="text-ink/90">{g.label}</span>
                      <span className="font-semibold" style={{ color: g.actual >= g.target ? '#16A34A' : '#94A3B8' }}>
                        {typeof g.actual === 'number' && g.key === 'revenue' ? `$${g.actual.toLocaleString()}` : g.actual} / {g.key === 'revenue' ? `$${g.target.toLocaleString()}` : g.target}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 text-[11px] text-muted">If missed: {kc.miss}</div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function Tile({ label, value, sub, accent, to }) {
  const inner = (
    <>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-1 text-2xl font-extrabold" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-muted">{sub}</div>}
    </>
  )
  return to ? (
    <a href={href(to)} className="card no-underline">
      {inner}
    </a>
  ) : (
    <div className="card">{inner}</div>
  )
}
