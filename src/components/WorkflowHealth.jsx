import {
  ResponsiveContainer,
  BarChart,
  Bar as RBar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import { Card, HealthDot } from './ui'
import { num, relativeTime, shortDate } from '../lib/format'

const TT = {
  contentStyle: {
    background: '#0B1D32',
    border: '1px solid #22436b',
    borderRadius: 8,
    color: '#F1F5F9',
    fontSize: 12,
  },
  cursor: { fill: 'rgba(240,115,22,0.08)' },
}

function Metric({ label, value, sub }) {
  return (
    <div className="rounded-lg border border-line/50 bg-panel2/40 p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-1 text-xl font-extrabold text-ink">{value}</div>
      {sub && <div className="text-[11px] text-muted">{sub}</div>}
    </div>
  )
}

export default function WorkflowHealth({ w }) {
  const last = w.lastRun
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-ink">Pipeline Health</div>
          <HealthDot level={w.healthLevel} />
        </div>
        {last ? (
          <div className="space-y-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted">Last Run</div>
              <div className="text-sm font-medium text-ink">
                {relativeTime(last.run_started_at)} · {shortDate(last.run_started_at)}
              </div>
              <div className="text-xs text-muted">
                {last.workflow_name}
                {last.city_pair ? ` · ${last.city_pair}` : ''}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`pill ${last.success ? 'bg-ok/15 text-ok' : 'bg-bad/15 text-bad'}`}
              >
                {last.success ? 'success' : 'failed'}
              </span>
              {last.error_message && (
                <span className="truncate text-xs text-bad">{last.error_message}</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Metric
                label="Leads · last run"
                value={num((last.compliance_leads_added || 0) + (last.digital_leads_added || 0))}
                sub={`${num(last.compliance_leads_added)} comp · ${num(last.digital_leads_added)} digi`}
              />
              <Metric label="Total Runs" value={num(w.totalRuns)} sub={`${num(w.totalLeadsAdded)} leads all-time`} />
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted">No workflow runs recorded.</div>
        )}
      </Card>

      <Card>
        <div className="mb-3 text-sm font-semibold text-ink">Enrichment Budget Usage</div>
        <div className="grid grid-cols-2 gap-2">
          <Metric label="Apollo Calls" value={num(w.apolloTotal)} sub={`${num(w.apolloEmails)} emails found`} />
          <Metric label="Hunter Calls" value={num(w.hunterTotal)} sub={`${num(w.hunterEmails)} emails found`} />
          {last && (
            <>
              <Metric label="Apollo · last run" value={num(last.apollo_calls_made)} sub={`${num(last.apollo_emails_found)} emails`} />
              <Metric label="Hunter · last run" value={num(last.hunter_calls_made)} sub={`${num(last.hunter_emails_found)} emails`} />
            </>
          )}
        </div>
        {last && (last.enterprise_flagged || last.amazon_blocked || last.bigbox_blocked) ? (
          <div className="mt-3 text-xs text-muted">
            Last run filters — {num(last.enterprise_flagged)} enterprise flagged ·{' '}
            {num(last.amazon_blocked)} Amazon · {num(last.bigbox_blocked)} big-box blocked
          </div>
        ) : null}
      </Card>

      <Card>
        <div className="mb-2 text-sm font-semibold text-ink">Leads Found per Run</div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={w.runsTrend} margin={{ top: 5, right: 5, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#22436b" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 10 }} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} allowDecimals={false} width={28} />
              <Tooltip {...TT} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <RBar dataKey="compliance" name="Compliance" stackId="a" fill="#F07316" radius={[3, 3, 0, 0]} />
              <RBar dataKey="digital" name="Digital" stackId="a" fill="#60A5FA" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}
