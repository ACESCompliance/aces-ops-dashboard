import { useMemo, useState } from 'react'
import {
  SEND_CHANNELS,
  SEND_TYPES,
  CHANNEL_BY_KEY,
  STAGE_BY_KEY,
  STEP_LABEL,
  stageOf,
  leadName,
  touchesByLead,
} from '../../lib/crm'
import { shortDate } from '../../lib/format'
import { ReachedChips } from './LeadTable'

const RANGES = [
  { key: 'all', label: 'Since Oct 18', days: null },
  { key: '30', label: 'Last 30 days', days: 30 },
  { key: '7', label: 'Last 7 days', days: 7 },
]

const STEPS = ['first', 'fu1', 'fu2']

const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : '—')

// Outreach broken down by channel: who you reached where, how far each
// sequence got on each channel, and where replies come from. Every number is
// clickable and drills into the list of contacts behind it.
export default function Channels({ leads, touches, onSelect }) {
  const [range, setRange] = useState('all')
  const [drill, setDrill] = useState(null) // { title, ids: Set }

  const leadById = useMemo(() => new Map(leads.map((l) => [l.id, l])), [leads])
  // Replies are judged on the full history: a reply counts for anyone reached
  // in the window, even if the reply itself came in later.
  const fullMap = useMemo(() => touchesByLead(touches), [touches])

  const data = useMemo(() => {
    const days = RANGES.find((r) => r.key === range)?.days
    const since = days ? Date.now() - days * 86400000 : 0
    const inRange = (touches || []).filter(
      (t) => leadById.has(t.lead_id) && new Date(t.created_at).getTime() >= since,
    )
    const sends = inRange.filter(
      (t) => t.direction === 'outbound' && SEND_TYPES.has(t.activity_type) && t.channel,
    )
    const replies = inRange.filter((t) => t.direction === 'inbound')
    const replied = (id) => Boolean(fullMap.get(id)?.reply)

    // Per channel.
    const per = {}
    for (const c of SEND_CHANNELS) {
      per[c.key] = { reached: new Set(), sends: 0, steps: { first: new Set(), fu1: new Set(), fu2: new Set(), other: new Set() }, repliesHere: new Set() }
    }
    const byLead = new Map()
    for (const t of sends) {
      const p = per[t.channel]
      if (!p) continue
      p.reached.add(t.lead_id)
      p.sends += 1
      ;(p.steps[t.step] || p.steps.other).add(t.lead_id)
      if (!byLead.has(t.lead_id)) byLead.set(t.lead_id, new Set())
      byLead.get(t.lead_id).add(t.channel)
    }
    for (const r of replies) if (per[r.channel]) per[r.channel].repliesHere.add(r.lead_id)
    for (const c of SEND_CHANNELS) {
      const p = per[c.key]
      p.replied = new Set([...p.reached].filter(replied))
    }

    // Channel mix: which combination of channels each person got.
    const mix = new Map()
    for (const [id, chans] of byLead) {
      const key = SEND_CHANNELS.filter((c) => chans.has(c.key)).map((c) => c.key).join('+')
      if (!mix.has(key)) mix.set(key, { ids: new Set(), replied: new Set() })
      mix.get(key).ids.add(id)
      if (replied(id)) mix.get(key).replied.add(id)
    }

    // Week by week (weeks start Monday).
    const weeks = new Map()
    const weekOf = (iso) => {
      const d = new Date(iso)
      const day = (d.getDay() + 6) % 7
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - day)
      return d.toISOString().slice(0, 10)
    }
    const blankWeek = () => ({ ...Object.fromEntries(SEND_CHANNELS.map((c) => [c.key, 0])), total: 0, replies: 0 })
    for (const t of sends) {
      const w = weekOf(t.created_at)
      if (!weeks.has(w)) weeks.set(w, blankWeek())
      weeks.get(w)[t.channel] += 1
      weeks.get(w).total += 1
    }
    for (const r of replies) {
      const w = weekOf(r.created_at)
      if (!weeks.has(w)) weeks.set(w, blankWeek())
      weeks.get(w).replies += 1
    }

    const reachedAll = new Set(sends.map((t) => t.lead_id))
    return {
      per,
      mix: [...mix.entries()].sort((a, b) => b[1].ids.size - a[1].ids.size),
      weeks: [...weeks.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)),
      totals: {
        reached: reachedAll,
        sends: sends.length,
        replied: new Set([...reachedAll].filter(replied)),
      },
    }
  }, [touches, range, leadById, fullMap])

  const open = (title, ids) => setDrill({ title, ids: new Set(ids) })
  const drillRows = drill
    ? [...drill.ids].map((id) => leadById.get(id)).filter(Boolean)
        .sort((a, b) => new Date(b.last_contacted_at || 0) - new Date(a.last_contacted_at || 0))
    : []

  const t = data.totals

  return (
    <div className="space-y-5">
      {/* Range */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-line/60 bg-panel/60 p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => {
                setRange(r.key)
                setDrill(null)
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                range === r.key ? 'bg-accent/20 text-accent' : 'text-muted hover:text-ink'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="text-xs text-muted">Click any number to see the people behind it.</div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="People reached" value={t.reached.size} onClick={() => open('Everyone reached', t.reached)} />
        <Tile label="Messages sent" value={t.sends} />
        <Tile label="Replied" value={t.replied.size} accent="#22D3EE" onClick={() => open('Everyone who replied', t.replied)} />
        <Tile label="Reply rate" value={pct(t.replied.size, t.reached.size)} accent="#22D3EE" />
      </div>

      {/* Channel cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {SEND_CHANNELS.map((c) => {
          const p = data.per[c.key]
          return (
            <div key={c.key} className="card" style={{ borderTop: `3px solid ${c.color}` }}>
              <div className="flex items-baseline justify-between">
                <div className="text-sm font-bold" style={{ color: c.color }}>
                  {c.icon} {c.label}
                </div>
                <div className="text-[11px] text-muted">{p.sends} sent</div>
              </div>
              <button
                onClick={() => open(`Reached on ${c.label}`, p.reached)}
                disabled={!p.reached.size}
                className="mt-1 text-left"
              >
                <span className="text-3xl font-extrabold text-ink">{p.reached.size}</span>
                <span className="ml-1.5 text-xs text-muted">people reached</span>
              </button>
              <div className="mt-3 space-y-1">
                {STEPS.map((s) => (
                  <Row
                    key={s}
                    label={STEP_LABEL[s]}
                    value={p.steps[s].size}
                    onClick={() => open(`${STEP_LABEL[s]} on ${c.label}`, p.steps[s])}
                  />
                ))}
                {p.steps.other.size > 0 && (
                  <Row label="Extra touches" value={p.steps.other.size} onClick={() => open(`Extra touches on ${c.label}`, p.steps.other)} />
                )}
              </div>
              <div className="mt-3 border-t border-line/30 pt-2">
                <Row
                  label="Replied (any channel)"
                  value={`${p.replied.size} · ${pct(p.replied.size, p.reached.size)}`}
                  onClick={() => open(`Reached on ${c.label} and replied`, p.replied)}
                  accent="#22D3EE"
                />
                <Row
                  label={`Replies that came in on ${c.label}`}
                  value={p.repliesHere.size}
                  onClick={() => open(`Replied via ${c.label}`, p.repliesHere)}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Channel mix */}
        <div className="card">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent">Channel mix</div>
          <p className="mb-3 text-xs text-muted">Which combination of channels each person got, and how many of them replied.</p>
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-line/60">
                <th className="th">Reached on</th>
                <th className="th text-right">People</th>
                <th className="th text-right">Replied</th>
                <th className="th text-right">Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.mix.map(([key, m]) => {
                const label = key.split('+').map((k) => CHANNEL_BY_KEY[k]?.label).join(' + ')
                return (
                  <tr
                    key={key}
                    onClick={() => open(`Reached on ${label}`, m.ids)}
                    className="cursor-pointer border-b border-line/30 hover:bg-panel2/40"
                  >
                    <td className="td">
                      {key.split('+').map((k) => CHANNEL_BY_KEY[k]?.icon).join(' ')} {label}
                    </td>
                    <td className="td text-right">{m.ids.size}</td>
                    <td className="td text-right">{m.replied.size}</td>
                    <td className="td text-right">{pct(m.replied.size, m.ids.size)}</td>
                  </tr>
                )
              })}
              {data.mix.length === 0 && (
                <tr>
                  <td className="td text-muted" colSpan={4}>No sends in this window.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Week by week */}
        <div className="card">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent">Week by week</div>
          <p className="mb-3 text-xs text-muted">Messages sent on each channel, by week (weeks start Monday).</p>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-line/60">
                  <th className="th">Week of</th>
                  {SEND_CHANNELS.map((c) => (
                    <th key={c.key} className="th text-right" title={c.label}>
                      {c.icon}
                    </th>
                  ))}
                  <th className="th text-right">Total</th>
                  <th className="th text-right">Replies</th>
                </tr>
              </thead>
              <tbody>
                {data.weeks.map(([w, row]) => (
                  <tr key={w} className="border-b border-line/30">
                    <td className="td whitespace-nowrap">{shortDate(`${w}T12:00:00`)}</td>
                    {SEND_CHANNELS.map((c) => (
                      <td key={c.key} className={`td text-right ${row[c.key] ? '' : 'text-muted'}`}>
                        {row[c.key] || '·'}
                      </td>
                    ))}
                    <td className="td text-right font-semibold">{row.total}</td>
                    <td className="td text-right" style={row.replies ? { color: '#22D3EE' } : undefined}>
                      {row.replies || '·'}
                    </td>
                  </tr>
                ))}
                {data.weeks.length === 0 && (
                  <tr>
                    <td className="td text-muted" colSpan={SEND_CHANNELS.length + 3}>No sends in this window.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Drill-down */}
      {drill && (
        <div className="card">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-sm font-bold text-ink">
              {drill.title} <span className="font-normal text-muted">({drillRows.length})</span>
            </div>
            <button onClick={() => setDrill(null)} className="link-btn">Close</button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-line/60">
                  <th className="th">Business</th>
                  <th className="th">Contact</th>
                  <th className="th">Stage</th>
                  <th className="th">Reached on</th>
                  <th className="th">Last touch</th>
                </tr>
              </thead>
              <tbody>
                {drillRows.map((l) => {
                  const st = STAGE_BY_KEY[stageOf(l)]
                  const tm = fullMap.get(l.id)
                  return (
                    <tr
                      key={l.id}
                      onClick={() => onSelect(l)}
                      className="cursor-pointer border-b border-line/30 hover:bg-panel2/40"
                    >
                      <td className="td font-medium">{l.business_name}</td>
                      <td className="td text-muted">{leadName(l) || '—'}</td>
                      <td className="td">
                        {st && (
                          <span className="pill" style={{ backgroundColor: `${st.color}22`, color: st.color }}>
                            {st.label}
                          </span>
                        )}
                      </td>
                      <td className="td">{tm ? <ReachedChips t={tm} /> : '—'}</td>
                      <td className="td whitespace-nowrap text-muted">
                        {tm?.last && <span className="mr-1">{CHANNEL_BY_KEY[tm.last.channel]?.icon}</span>}
                        {shortDate(l.last_contacted_at)}
                      </td>
                    </tr>
                  )
                })}
                {drillRows.length === 0 && (
                  <tr>
                    <td className="td text-muted" colSpan={5}>Nobody here yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function Tile({ label, value, accent, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className={`card text-left ${onClick ? 'hover:border-accent/50' : ''}`}>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-1 text-2xl font-extrabold" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
    </Tag>
  )
}

function Row({ label, value, onClick, accent }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded px-1 py-0.5 text-left text-xs hover:bg-panel2/50"
    >
      <span className="text-muted">{label}</span>
      <span className="font-semibold" style={{ color: accent || undefined }}>
        {value}
      </span>
    </button>
  )
}
