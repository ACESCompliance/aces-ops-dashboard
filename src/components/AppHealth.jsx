import { Card } from './ui'
import { num, relativeTime } from '../lib/format'

function probeColor(ms, ok) {
  if (!ok) return 'text-bad'
  if (ms > 1500) return 'text-warn'
  return 'text-ok'
}

export default function AppHealth({ health, workflow, fetchedAt }) {
  const probes = health?.probes || []
  const allOk = probes.length > 0 && probes.every((p) => p.ok)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-ink">Supabase API</div>
          <span className={`pill ${allOk ? 'bg-ok/15 text-ok' : 'bg-bad/15 text-bad'}`}>
            {allOk ? 'all systems go' : 'degraded'}
          </span>
        </div>
        <div className="space-y-2">
          {probes.map((p) => (
            <div key={p.name} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className={`inline-block h-2 w-2 rounded-full ${p.ok ? 'bg-ok' : 'bg-bad'}`} />
                <code className="text-ink/90">{p.name}</code>
              </span>
              <span className={probeColor(p.ms, p.ok)}>{p.ok ? `${p.ms} ms` : 'error'}</span>
            </div>
          ))}
          {probes.length === 0 && <div className="text-sm text-muted">No probe data.</div>}
        </div>
        <div className="mt-3 border-t border-line/40 pt-2 text-xs text-muted">
          Server round-trip: {num(health?.serverMs)} ms · REST{' '}
          {health?.restReachable ? 'reachable' : 'unreachable'}
        </div>
      </Card>

      <Card>
        <div className="mb-3 text-sm font-semibold text-ink">Data Freshness</div>
        <div className="space-y-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted">Dashboard data</div>
            <div className="text-sm font-medium text-ink">{relativeTime(fetchedAt)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted">Last lead-gen run</div>
            <div className="text-sm font-medium text-ink">
              {workflow.lastRun ? relativeTime(workflow.lastRun.run_started_at) : '—'}
            </div>
            <div className="text-xs text-muted">
              {workflow.lastRun
                ? workflow.lastRun.success
                  ? 'completed successfully'
                  : 'last run failed'
                : 'no runs recorded'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                { green: 'bg-ok', yellow: 'bg-warn', red: 'bg-bad' }[workflow.healthLevel] || 'bg-muted'
              }`}
            />
            <span className="text-sm text-ink">Pipeline {workflow.healthLevel}</span>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-3 text-sm font-semibold text-ink">Deployment</div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted">Frontend</span>
            <span className="text-ink">Netlify (static + functions)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Backend</span>
            <span className="text-ink">Supabase (service-role function)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Build</span>
            <span className="text-ink">{__BUILD_TIME__}</span>
          </div>
        </div>
        <div className="mt-3 border-t border-line/40 pt-2 text-xs text-muted">
          Build timestamp reflects the last deploy. Live function status above confirms the API is
          responding.
        </div>
      </Card>
    </div>
  )
}
