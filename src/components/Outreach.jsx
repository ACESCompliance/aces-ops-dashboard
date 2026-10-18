import { useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { Card, StatCard } from './ui'
import { num, shortDate, relativeTime, titleize } from '../lib/format'

const TT = {
  contentStyle: {
    background: '#0B1D32',
    border: '1px solid #22436b',
    borderRadius: 8,
    color: '#F1F5F9',
    fontSize: 12,
  },
}

const STATUS_STYLES = {
  pending: 'bg-warn/15 text-warn',
  approved: 'bg-accent2/15 text-accent2',
  sent: 'bg-ok/15 text-ok',
  rejected: 'bg-bad/15 text-bad',
}

function OutreachPill({ status }) {
  return (
    <span className={`pill ${STATUS_STYLES[status] || 'bg-muted/15 text-muted'}`}>{status}</span>
  )
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending approval' },
  { key: 'approved', label: 'Approved' },
  { key: 'sent', label: 'Sent' },
  { key: 'rejected', label: 'Rejected' },
]

export default function Outreach({ o }) {
  const [filter, setFilter] = useState('all')
  const [channel, setChannel] = useState('all')
  const [openId, setOpenId] = useState(null)

  const channels = Array.from(new Set(o.rows.map((r) => r.channel).filter(Boolean)))
  const rows = o.rows.filter(
    (r) =>
      (filter === 'all' || r.status === filter) &&
      (channel === 'all' || r.channel === channel),
  )

  return (
    <div className="space-y-6">
      {/* Alarms — the reason this tab exists */}
      {o.stuckApproved.length > 0 && (
        <div className="rounded-lg border border-bad/40 bg-bad/10 px-4 py-3 text-sm text-bad">
          <strong>{o.stuckApproved.length} approved email{o.stuckApproved.length > 1 ? 's have' : ' has'} not
          been sent</strong>{' '}
          despite being approved more than a day ago — the Auto-Sender may be failing or not marking
          sends. Oldest approval:{' '}
          {shortDate(o.stuckApproved.reduce((m, r) => (r.approved_at < m ? r.approved_at : m), o.stuckApproved[0].approved_at))}.
        </div>
      )}
      {o.withErrors.length > 0 && (
        <div className="rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          {o.withErrors.length} queue item{o.withErrors.length > 1 ? 's carry' : ' carries'} an error note —
          open the row for details.
        </div>
      )}
      {o.manualTouches.length > 0 && (
        <div className="rounded-lg border border-accent2/40 bg-accent2/10 px-4 py-3 text-sm text-accent2">
          <strong>{o.manualTouches.length} manual touch{o.manualTouches.length > 1 ? 'es' : ''} waiting on you:</strong>{' '}
          {o.manualTouches
            .map((r) => `${titleize(r.channel)} → ${r.recipient_name || r.business_name}`)
            .join(' · ')}{' '}
          (approved {relativeTime(o.manualTouches[0].approved_at)} — these are not auto-sent)
        </div>
      )}

      {/* Stat row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Pending Approval"
          value={num(o.pending)}
          sub={o.pending ? `oldest waiting ${num(o.oldestPendingDays)}d` : 'queue clear'}
          accent
        />
        <StatCard
          label="Approved · Unsent"
          value={num(o.approved)}
          sub={o.stuckApproved.length ? `${num(o.stuckApproved.length)} stuck >24h` : 'sends on schedule'}
        />
        <StatCard
          label="Sent · 30 days"
          value={num(o.sent30d)}
          sub={`${num(o.sent7d)} this week · ${num(o.sentTotal)} all time`}
        />
        <StatCard
          label="Last Send"
          value={o.lastSentAt ? relativeTime(o.lastSentAt) : '—'}
          sub={o.lastSentAt ? shortDate(o.lastSentAt) : 'nothing sent yet'}
        />
      </div>

      {/* Send activity */}
      <Card>
        <div className="mb-1 text-sm font-semibold text-ink">Emails Sent · last 30 days</div>
        <div className="mb-3 text-xs text-muted">
          Weekday sends by the Auto-Sender (cap 5/day). Gaps on weekdays with approved items waiting
          are the signal something's wrong.
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={o.sendsTrend} margin={{ top: 5, right: 5, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#22436b" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 10 }} interval={6} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} allowDecimals={false} width={28} />
              <Tooltip {...TT} cursor={{ fill: 'rgba(34,67,107,0.25)' }} formatter={(v) => [v, 'Sent']} />
              <Bar dataKey="count" fill="#E35F00" radius={[4, 4, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Queue table */}
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold text-ink">
            Queue · {rows.length}
            {rows.length !== o.rows.length && <span className="text-muted"> of {o.rows.length}</span>}
          </div>
          <div className="flex items-center gap-2">
            <select className="input w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
              {FILTERS.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
            {channels.length > 1 && (
              <select className="input w-auto" value={channel} onChange={(e) => setChannel(e.target.value)}>
                <option value="all">All channels</option>
                {channels.map((c) => (
                  <option key={c} value={c}>{titleize(c)}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-line/60">
                <th className="th">Business</th>
                <th className="th">Recipient</th>
                <th className="th">Subject</th>
                <th className="th">Touch</th>
                <th className="th">Status</th>
                <th className="th text-right">Created</th>
                <th className="th text-right">Sent</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <>
                  <tr
                    key={r.id}
                    className="cursor-pointer border-b border-line/30 transition-colors hover:bg-panel2/40"
                    onClick={() => setOpenId(openId === r.id ? null : r.id)}
                  >
                    <td className="td font-medium">{r.business_name || '—'}</td>
                    <td className="td">
                      <div className="text-ink/90">{r.recipient_name || '—'}</div>
                      <div className="max-w-[220px] truncate text-xs text-muted">{r.recipient_email}</div>
                    </td>
                    <td className="td max-w-[260px] truncate text-muted">{r.email_subject || '—'}</td>
                    <td className="td text-muted">
                      {titleize(r.draft_type)} · #{r.touch_number}
                      {r.channel !== 'email' && (
                        <span className="ml-1 text-xs text-accent2">({r.channel})</span>
                      )}
                    </td>
                    <td className="td"><OutreachPill status={r.status} /></td>
                    <td className="td text-right text-muted">{shortDate(r.created_at)}</td>
                    <td className="td text-right text-muted">{r.sent_at ? shortDate(r.sent_at) : '—'}</td>
                  </tr>
                  {openId === r.id && (
                    <tr key={`${r.id}-detail`} className="border-b border-line/30 bg-panel2/30">
                      <td className="td" colSpan={7}>
                        <div className="space-y-2 py-2">
                          <div className="text-xs text-muted">
                            Created {shortDate(r.created_at)}
                            {r.approved_at ? ` · approved ${shortDate(r.approved_at)}` : ' · not yet approved'}
                            {r.sent_at ? ` · sent ${shortDate(r.sent_at)}` : ' · not sent'}
                          </div>
                          {r.rejection_reason && (
                            <div className="text-xs text-bad">Rejected: {r.rejection_reason}</div>
                          )}
                          {r.error_message && (
                            <div className="rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
                              {r.error_message}
                            </div>
                          )}
                          <div className="text-sm font-semibold text-ink">{r.email_subject}</div>
                          <pre className="whitespace-pre-wrap rounded-md bg-bg/60 px-3 py-2 font-sans text-sm text-ink/85">
                            {r.email_body}
                          </pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="td text-muted" colSpan={7}>Nothing in the queue for this filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
