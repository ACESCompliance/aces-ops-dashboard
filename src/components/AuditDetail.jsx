import { useEffect, useState } from 'react'
import { Card, StatCard, StatusPill } from './ui'
import { href } from '../lib/router'
import { fetchAuditPhotos } from '../lib/api'
import { currency, num, pct, shortDate, titleize } from '../lib/format'

function scoreColor(s) {
  if (s == null) return 'text-muted'
  if (s >= 85) return 'text-ok'
  if (s >= 70) return 'text-warn'
  return 'text-bad'
}

// Severity display order + styling. Willful/repeat fold into Critical.
const SEVERITY_GROUPS = [
  { key: 'critical', label: 'Critical', pill: 'bg-bad/15 text-bad', border: 'border-bad/40' },
  { key: 'serious', label: 'Serious', pill: 'bg-accent/15 text-accent', border: 'border-accent/40' },
  { key: 'other', label: 'Other-than-serious', pill: 'bg-accent2/15 text-accent2', border: 'border-accent2/40' },
]

function bucketOf(f) {
  if (f.priority === 'critical' || f.severity === 'willful' || f.severity === 'repeat') return 'critical'
  if (f.severity === 'serious') return 'serious'
  return 'other'
}

function Finding({ f }) {
  const dismissed = Boolean(f.dismissed_at)
  return (
    <div className={`rounded-lg border border-line/40 p-4 ${dismissed ? 'opacity-50' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-ink">{f.title}</div>
          <div className="mt-0.5 text-xs text-muted">
            {f.cfr_citation && <span className="font-mono text-accent2">{f.cfr_citation}</span>}
            {f.cfr_title ? ` · ${f.cfr_title}` : ''}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {f.finding_type && (
            <span className={`pill ${f.finding_type === 'actual' ? 'bg-bad/15 text-bad' : 'bg-muted/15 text-muted'}`}>
              {f.finding_type}
            </span>
          )}
          {f.priority && <span className="pill bg-panel2 text-muted">{f.priority}</span>}
          {dismissed && <span className="pill bg-muted/15 text-muted">dismissed</span>}
          <span className="text-sm font-bold text-accent">{currency(f.estimated_penalty)}</span>
        </div>
      </div>
      {f.description && <p className="mt-2 text-sm text-ink/80">{f.description}</p>}
      {f.recommended_action && (
        <div className="mt-2 rounded-md bg-panel2/50 px-3 py-2 text-sm text-ink/80">
          <span className="text-xs font-semibold uppercase tracking-wider text-ok">Fix: </span>
          {f.recommended_action}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
        <span>{f.ai_confidence != null ? `AI confidence ${Math.round(Number(f.ai_confidence) * 100)}%` : ''}</span>
        <span>{shortDate(f.created_at)}</span>
      </div>
      {dismissed && f.dismissal_reason && (
        <div className="mt-1 text-xs text-muted">Dismissed: {f.dismissal_reason}</div>
      )}
    </div>
  )
}

export default function AuditDetail({ audit }) {
  const [photos, setPhotos] = useState(null)
  const [photosError, setPhotosError] = useState(null)

  useEffect(() => {
    if (!audit || audit.photosMeta.length === 0) return
    let alive = true
    fetchAuditPhotos(audit.id)
      .then((r) => alive && setPhotos(r.photos || []))
      .catch((e) => alive && setPhotosError(e.message))
    return () => {
      alive = false
    }
  }, [audit])

  if (!audit) {
    return (
      <Card>
        <div className="text-sm text-muted">
          Audit not found. <a className="text-accent hover:underline" href={href('audits')}>Back to all audits</a>
        </div>
      </Card>
    )
  }

  const live = audit.findings.filter((f) => !f.dismissed_at)
  const grouped = SEVERITY_GROUPS.map((g) => ({
    ...g,
    items: audit.findings.filter((f) => bucketOf(f) === g.key),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <a className="text-xs font-semibold text-muted hover:text-accent" href={href('audits')}>
          ← All audits
        </a>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">
              {audit.title || 'Untitled audit'}
            </h1>
            <div className="mt-1 text-sm text-muted">
              <a className="font-medium text-accent hover:underline" href={href(`sites/${audit.site_id}`)}>
                {audit.siteName}
              </a>
              {audit.siteCompany ? ` · ${audit.siteCompany}` : ''}
              {' · '}
              {shortDate(audit.audit_date || audit.created_at)}
              {audit.creatorName ? ` · by ${audit.creatorName}` : ''}
            </div>
          </div>
          <StatusPill status={audit.status} />
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Compliance Score"
          value={audit.compliance_score == null ? '—' : pct(Number(audit.compliance_score))}
          accent
        />
        <StatCard
          label="Findings"
          value={num(live.length)}
          sub={`${num(audit.actual_findings_count || 0)} actual · ${num(audit.potential_findings_count || 0)} potential`}
        />
        <StatCard label="Penalty Exposure" value={currency(audit.total_penalty_exposure)} />
        <StatCard label="Photos" value={num(audit.photosMeta.length)} sub="analyzed by AI" />
      </div>

      {/* Photos */}
      {audit.photosMeta.length > 0 && (
        <Card>
          <div className="mb-3 text-sm font-semibold text-ink">Photos</div>
          {photosError && (
            <div className="text-sm text-bad">Couldn’t load photos: {photosError}</div>
          )}
          {!photos && !photosError && (
            <div className="text-sm text-muted">Loading photos…</div>
          )}
          {photos && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((p) => (
                <figure key={p.id} className="overflow-hidden rounded-lg border border-line/40">
                  {p.url ? (
                    <a href={p.url} target="_blank" rel="noreferrer">
                      <img
                        src={p.url}
                        alt={p.zone_label || 'audit photo'}
                        loading="lazy"
                        className="aspect-[4/3] w-full object-cover transition-transform hover:scale-[1.03]"
                      />
                    </a>
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-panel2/60 text-xs text-muted">
                      photo unavailable
                    </div>
                  )}
                  <figcaption className="flex items-center justify-between px-2 py-1.5 text-[11px] text-muted">
                    <span className="truncate">{p.zone_label || 'Unlabeled zone'}</span>
                    <span>{titleize(p.status)}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Findings by severity */}
      <div className="space-y-4">
        {grouped.map((g) => (
          <Card key={g.key} className={`border ${g.border}`}>
            <div className="mb-3 flex items-center gap-2">
              <span className={`pill ${g.pill}`}>{g.label}</span>
              <span className="text-sm font-semibold text-ink">{g.items.length}</span>
            </div>
            <div className="space-y-3">
              {g.items.map((f) => (
                <Finding key={f.id} f={f} />
              ))}
            </div>
          </Card>
        ))}
        {audit.findings.length === 0 && (
          <Card>
            <div className="text-sm text-muted">No findings recorded for this audit.</div>
          </Card>
        )}
      </div>

      {/* Corrective actions */}
      {audit.actions.length > 0 && (
        <Card>
          <div className="mb-3 text-sm font-semibold text-ink">Corrective Actions</div>
          <div className="space-y-3">
            {audit.actions.map((a) => (
              <div key={a.id} className="rounded-lg border border-line/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-ink">{a.title}</div>
                    <div className="text-xs text-muted">
                      {a.assigned_to_name ? `assigned to ${a.assigned_to_name}` : 'unassigned'}
                      {a.due_date ? ` · due ${shortDate(a.due_date)}` : ''}
                      {a.priority ? ` · ${a.priority} priority` : ''}
                    </div>
                  </div>
                  <StatusPill status={a.status} />
                </div>
                {a.description && <p className="mt-2 text-sm text-ink/80">{a.description}</p>}
                {a.updates.length > 0 && (
                  <div className="mt-3 space-y-2 border-l-2 border-line/50 pl-3">
                    {a.updates.map((u) => (
                      <div key={u.id} className="text-xs">
                        <span className="text-muted">{shortDate(u.created_at)}</span>
                        {u.kind && <span className="ml-1 text-accent2">[{u.kind.replace(/_/g, ' ')}]</span>}
                        <span className="ml-1 text-ink/80">{u.update_text}</span>
                      </div>
                    ))}
                  </div>
                )}
                {a.completed_at && (
                  <div className="mt-2 text-xs text-ok">
                    Completed {shortDate(a.completed_at)}
                    {a.completed_by ? ` by ${a.completed_by}` : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
