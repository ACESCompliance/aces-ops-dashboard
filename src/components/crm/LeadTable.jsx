import { useMemo, useState } from 'react'
import {
  STAGES,
  STAGE_BY_KEY,
  stageOf,
  leadName,
  hasEmail,
  completeness,
  SEND_CHANNELS,
  CHANNEL_BY_KEY,
  STEP_SHORT,
} from '../../lib/crm'
import { shortDate, titleize } from '../../lib/format'

const COLUMNS = [
  { key: 'business_name', label: 'Business' },
  { key: 'city', label: 'City' },
  { key: 'name', label: 'Contact' },
  { key: 'contact_email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'pipeline_stage', label: 'Stage' },
  { key: 'reached', label: 'Reached On' },
  { key: 'last_contacted_at', label: 'Last Touch' },
  { key: 'next_followup_at', label: 'Next Follow-up' },
]

const EMPTY_TOUCH = { byChannel: {}, byChannelStep: {}, steps: new Set(), last: null, reply: null, sends: 0 }

function sortValue(l, key, t) {
  switch (key) {
    case 'reached':
      return t.sends
    case 'name':
      return leadName(l).toLowerCase()
    case 'pipeline_stage':
      return STAGES.findIndex((s) => s.key === stageOf(l))
    case 'last_contacted_at':
    case 'next_followup_at':
      return l[key] ? new Date(l[key]).getTime() : 0
    default:
      return (l[key] || '').toString().toLowerCase()
  }
}

export default function LeadTable({ leads, onSelect, touchMap, initialChannel = 'all' }) {
  const [stage, setStage] = useState('all')
  const [emailFilter, setEmailFilter] = useState('all')
  const [tier, setTier] = useState('all')
  const [query, setQuery] = useState('')
  const [channel, setChannel] = useState(initialChannel)
  const [stepF, setStepF] = useState('all')
  const [replied, setReplied] = useState('all')
  const touchOf = (l) => touchMap?.get(l.id) || EMPTY_TOUCH
  // Default: most complete leads (email + name) first.
  const [sort, setSort] = useState({ key: 'completeness', dir: 'desc' })

  const tiers = useMemo(
    () => [...new Set(leads.map((l) => l.lead_tier).filter(Boolean))].sort(),
    [leads],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let rows = leads.filter((l) => {
      if (stage !== 'all' && stageOf(l) !== stage) return false
      if (emailFilter === 'has' && !hasEmail(l)) return false
      if (emailFilter === 'no' && hasEmail(l)) return false
      if (tier !== 'all' && l.lead_tier !== tier) return false
      const t = touchOf(l)
      if (channel === 'none' && t.sends > 0) return false
      if (channel === 'multi' && Object.keys(t.byChannel).length < 2) return false
      if (!['all', 'none', 'multi'].includes(channel) && !t.byChannel[channel]) return false
      if (stepF !== 'all') {
        const has = channel !== 'all' && !['none', 'multi'].includes(channel)
          ? Boolean(t.byChannelStep[`${channel}:${stepF}`])
          : t.steps.has(stepF)
        if (!has) return false
      }
      if (replied === 'yes' && !t.reply) return false
      if (replied === 'no' && t.reply) return false
      if (q) {
        const hay = [l.business_name, l.city, leadName(l), l.contact_email]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })

    rows = [...rows].sort((a, b) => {
      let cmp
      if (sort.key === 'completeness') {
        cmp = completeness(a) - completeness(b)
        if (cmp === 0) cmp = (a.business_name || '').localeCompare(b.business_name || '')
      } else {
        const va = sortValue(a, sort.key, touchOf(a))
        const vb = sortValue(b, sort.key, touchOf(b))
        cmp = va < vb ? -1 : va > vb ? 1 : 0
      }
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return rows
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, stage, emailFilter, tier, query, sort, channel, stepF, replied, touchMap])

  const toggleSort = (key) =>
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' },
    )

  return (
    <div className="card">
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search business, city, contact…"
          className="min-w-[200px] flex-1 rounded-lg border border-line/60 bg-bg/60 px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent/60 focus:outline-none"
        />
        <Select value={stage} onChange={setStage} label="Stage">
          <option value="all">All stages</option>
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select value={emailFilter} onChange={setEmailFilter} label="Email">
          <option value="all">Any email</option>
          <option value="has">Has email</option>
          <option value="no">No email</option>
        </Select>
        <Select value={tier} onChange={setTier} label="Tier">
          <option value="all">All tiers</option>
          {tiers.map((t) => (
            <option key={t} value={t}>
              {titleize(t)}
            </option>
          ))}
        </Select>
        <Select value={channel} onChange={setChannel} label="Channel">
          <option value="all">Any channel</option>
          {SEND_CHANNELS.map((c) => (
            <option key={c.key} value={c.key}>
              Reached on {c.label}
            </option>
          ))}
          <option value="multi">Reached on 2+ channels</option>
          <option value="none">Not reached yet</option>
        </Select>
        <Select value={stepF} onChange={setStepF} label="Step">
          <option value="all">Any step</option>
          <option value="first">Got first message</option>
          <option value="fu1">Got follow-up 1</option>
          <option value="fu2">Got follow-up 2</option>
        </Select>
        <Select value={replied} onChange={setReplied} label="Replied">
          <option value="all">Replied or not</option>
          <option value="yes">Replied</option>
          <option value="no">No reply yet</option>
        </Select>
        <span className="ml-auto text-xs text-muted">{filtered.length} leads</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-line/60">
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className="th cursor-pointer select-none whitespace-nowrap hover:text-accent"
                  onClick={() => toggleSort(c.key)}
                >
                  {c.label}
                  {sort.key === c.key && (
                    <span className="ml-1 text-accent">{sort.dir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 400).map((l) => {
              const stageInfo = STAGE_BY_KEY[stageOf(l)]
              const overdue =
                l.next_followup_at && new Date(l.next_followup_at).getTime() <= Date.now()
              return (
                <tr
                  key={l.id}
                  onClick={() => onSelect(l)}
                  className="cursor-pointer border-b border-line/30 hover:bg-panel2/40"
                >
                  <td className="td font-medium">{l.business_name}</td>
                  <td className="td text-muted">{l.city || '—'}</td>
                  <td className="td text-muted">{leadName(l) || '—'}</td>
                  <td className="td">
                    {hasEmail(l) ? (
                      <span className="text-accent2">{l.contact_email}</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="td text-muted">{l.phone || '—'}</td>
                  <td className="td">
                    {stageInfo && (
                      <span
                        className="pill"
                        style={{
                          backgroundColor: `${stageInfo.color}22`,
                          color: stageInfo.color,
                        }}
                      >
                        {stageInfo.label}
                      </span>
                    )}
                  </td>
                  <td className="td">
                    <ReachedChips t={touchOf(l)} />
                  </td>
                  <td className="td whitespace-nowrap text-muted">
                    {touchOf(l).last && (
                      <span className="mr-1" title={CHANNEL_BY_KEY[touchOf(l).last.channel]?.label}>
                        {CHANNEL_BY_KEY[touchOf(l).last.channel]?.icon}
                      </span>
                    )}
                    {shortDate(l.last_contacted_at)}
                  </td>
                  <td className={`td ${overdue ? 'text-bad' : 'text-muted'}`}>
                    {shortDate(l.next_followup_at)}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td className="td text-muted" colSpan={COLUMNS.length}>
                  No leads match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {filtered.length > 400 && (
          <div className="pt-3 text-center text-xs text-muted">
            Showing first 400 of {filtered.length}. Narrow with filters to see more.
          </div>
        )}
      </div>
    </div>
  )
}

// Small per-channel chips: icon, sends on that channel, and the furthest step
// reached there. A reply shows as a cyan tag with the channel it came in on.
export function ReachedChips({ t }) {
  const chans = SEND_CHANNELS.filter((c) => t.byChannel[c.key])
  if (!chans.length && !t.reply) return <span className="text-muted">—</span>
  const furthest = (key) =>
    ['fu2', 'fu1', 'first', 'other'].find((s) => t.byChannelStep[`${key}:${s}`])
  return (
    <span className="flex flex-wrap items-center gap-1">
      {chans.map((c) => (
        <span
          key={c.key}
          title={`${c.label}: ${t.byChannel[c.key]} sent`}
          className="whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold"
          style={{ backgroundColor: `${c.color}22`, color: c.color }}
        >
          {c.icon} {STEP_SHORT[furthest(c.key)] || t.byChannel[c.key]}
        </span>
      ))}
      {t.reply && (
        <span
          title={`Replied via ${CHANNEL_BY_KEY[t.reply.channel]?.label || 'unknown'}`}
          className="whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold"
          style={{ backgroundColor: '#22D3EE22', color: '#22D3EE' }}
        >
          ↩ {CHANNEL_BY_KEY[t.reply.channel]?.icon || ''}
        </span>
      )}
    </span>
  )
}

function Select({ value, onChange, label, children }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-line/60 bg-bg/60 px-3 py-2 text-sm text-ink focus:border-accent/60 focus:outline-none"
    >
      {children}
    </select>
  )
}
