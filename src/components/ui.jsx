// Small shared presentational primitives used across sections.

export function SectionHeader({ children, right }) {
  return (
    <div className="mb-3 mt-2 flex items-center justify-between">
      <h2 className="section-title">{children}</h2>
      {right}
    </div>
  )
}

export function Card({ children, className = '' }) {
  return <div className={`card ${className}`}>{children}</div>
}

export function StatCard({ label, value, sub, accent, to }) {
  const body = (
    <>
      <div className="flex items-start justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</div>
        {to && <span className="text-xs text-muted transition-colors group-hover:text-accent">→</span>}
      </div>
      <div className={`stat-num mt-2 ${accent ? 'text-accent' : ''}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </>
  )
  if (to) {
    return (
      <a href={`#/${to}`} className="card card-hover group block cursor-pointer no-underline">
        {body}
      </a>
    )
  }
  return <div className="card card-hover">{body}</div>
}

export function Bar({ value, max, color = '#F07316' }) {
  const w = max > 0 ? Math.max(2, (value / max) * 100) : 0
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-bg">
      <div className="h-full rounded-full" style={{ width: `${w}%`, backgroundColor: color }} />
    </div>
  )
}

const STATUS_STYLES = {
  complete: 'bg-ok/15 text-ok',
  completed: 'bg-ok/15 text-ok',
  in_progress: 'bg-warn/15 text-warn',
  open: 'bg-accent2/15 text-accent2',
  draft: 'bg-muted/15 text-muted',
  cancelled: 'bg-bad/15 text-bad',
}

export function StatusPill({ status }) {
  const cls = STATUS_STYLES[status] || 'bg-muted/15 text-muted'
  return <span className={`pill ${cls}`}>{(status || '—').replace(/_/g, ' ')}</span>
}

export function HealthDot({ level }) {
  const map = { green: 'bg-ok', yellow: 'bg-warn', red: 'bg-bad' }
  const label = { green: 'Healthy', yellow: 'Stale', red: 'Attention' }
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${map[level] || 'bg-muted'}`} />
      <span className="text-sm font-medium text-ink">{label[level] || 'Unknown'}</span>
    </span>
  )
}
