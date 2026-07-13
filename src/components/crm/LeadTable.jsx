import { useMemo, useState } from 'react'
import {
  STAGES,
  STAGE_BY_KEY,
  stageOf,
  leadName,
  hasEmail,
  completeness,
} from '../../lib/crm'
import { shortDate, titleize } from '../../lib/format'

const COLUMNS = [
  { key: 'business_name', label: 'Business' },
  { key: 'city', label: 'City' },
  { key: 'name', label: 'Contact' },
  { key: 'contact_email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'pipeline_stage', label: 'Stage' },
  { key: 'last_contacted_at', label: 'Last Contacted' },
  { key: 'next_followup_at', label: 'Next Follow-up' },
]

function sortValue(l, key) {
  switch (key) {
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

export default function LeadTable({ leads, onSelect }) {
  const [stage, setStage] = useState('all')
  const [emailFilter, setEmailFilter] = useState('all')
  const [tier, setTier] = useState('all')
  const [query, setQuery] = useState('')
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
        const va = sortValue(a, sort.key)
        const vb = sortValue(b, sort.key)
        cmp = va < vb ? -1 : va > vb ? 1 : 0
      }
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return rows
  }, [leads, stage, emailFilter, tier, query, sort])

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
                  <td className="td text-muted">{shortDate(l.last_contacted_at)}</td>
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
