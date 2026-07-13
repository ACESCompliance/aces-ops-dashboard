import { Card, StatusPill } from './ui'
import { num, shortDate, titleize } from '../lib/format'

const PRIORITY_STYLES = {
  critical: 'text-bad',
  high: 'text-accent',
  medium: 'text-warn',
  low: 'text-muted',
}

export default function ActionsGenerated({ actions }) {
  const counts = actions.reduce((m, a) => {
    const k = a.status || 'open'
    m[k] = (m[k] || 0) + 1
    return m
  }, {})

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="text-sm font-semibold text-ink">Corrective Actions</div>
        <div className="flex flex-wrap gap-2">
          {['open', 'in_progress', 'complete', 'cancelled'].map((s) =>
            counts[s] ? (
              <span key={s} className="text-xs text-muted">
                <span className="font-semibold text-ink">{num(counts[s])}</span> {s.replace(/_/g, ' ')}
              </span>
            ) : null,
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-line/60">
              <th className="th">Action</th>
              <th className="th">Site</th>
              <th className="th">Assigned</th>
              <th className="th">Priority</th>
              <th className="th">Due</th>
              <th className="th">Status</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((a) => (
              <tr key={a.id} className="border-b border-line/30 hover:bg-panel2/40">
                <td className="td font-medium">{a.title}</td>
                <td className="td text-muted">{a.siteName}</td>
                <td className="td text-muted">{a.assigned_to_name || '—'}</td>
                <td className={`td font-semibold ${PRIORITY_STYLES[a.priority] || 'text-muted'}`}>
                  {titleize(a.priority)}
                </td>
                <td className="td text-muted">{a.due_date ? shortDate(a.due_date) : '—'}</td>
                <td className="td"><StatusPill status={a.status} /></td>
              </tr>
            ))}
            {actions.length === 0 && (
              <tr>
                <td className="td text-muted" colSpan={6}>No corrective actions generated yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
