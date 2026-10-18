import { useEffect, useState } from 'react'
import {
  STAGES,
  ACTIVITY_TYPES,
  ACTIVITY_BY_KEY,
  leadName,
  stageOf,
  mailtoFor,
  fetchActivities,
  addActivity,
  updateLead,
} from '../../lib/crm'
import { relativeTime, shortDate, titleize } from '../../lib/format'

// Slide-out panel for a single lead. Edits PATCH the lead via the API and bubble
// the updated row up through onUpdated so the board/table stay in sync.
export default function LeadDetail({ lead, onClose, onUpdated }) {
  const [activities, setActivities] = useState([])
  const [loadingActs, setLoadingActs] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  // Editable form state, seeded from the lead.
  const [stage, setStage] = useState(stageOf(lead))
  const [followup, setFollowup] = useState(toDateInput(lead.next_followup_at))
  const [notes, setNotes] = useState(lead.outreach_notes || '')
  const [draft, setDraft] = useState(lead.draft_message || '')
  const [fit, setFit] = useState({
    warm_or_cold: lead.warm_or_cold || '',
    mutual_connection: lead.mutual_connection || '',
    deal_value_usd: lead.deal_value_usd ?? '',
  })
  const [copied, setCopied] = useState(false)
  const [social, setSocial] = useState({
    linkedin_url: lead.linkedin_url || '',
    facebook_url: lead.facebook_url || '',
    instagram_url: lead.instagram_url || '',
  })

  // Add-activity form.
  const [actType, setActType] = useState('call')
  const [actText, setActText] = useState('')

  const id = lead.id

  useEffect(() => {
    let live = true
    setLoadingActs(true)
    fetchActivities(id)
      .then((a) => live && setActivities(a))
      .catch(() => live && setActivities([]))
      .finally(() => live && setLoadingActs(false))
    return () => {
      live = false
    }
  }, [id])

  // Esc to close.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function patch(fields, optimistic) {
    setSaving(true)
    setErr(null)
    try {
      const updated = await updateLead(id, fields)
      onUpdated({ ...lead, ...optimistic, ...(updated || {}) })
    } catch (e) {
      setErr(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function onStageChange(next) {
    setStage(next)
    await patch({ pipeline_stage: next }, { pipeline_stage: next })
  }

  async function onSaveFollowup() {
    const iso = followup ? new Date(followup).toISOString() : ''
    await patch({ next_followup_at: iso }, { next_followup_at: iso || null })
  }

  async function onSaveNotes() {
    await patch({ outreach_notes: notes }, { outreach_notes: notes })
  }

  async function onSaveSocial() {
    await patch({ ...social }, { ...social })
  }

  async function onSaveDraft() {
    await patch({ draft_message: draft }, { draft_message: draft })
  }

  async function onSaveFit() {
    await patch({ ...fit }, { ...fit })
  }

  async function onCopyDraft() {
    try {
      await navigator.clipboard.writeText(draft)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked; user can select-all */
    }
  }

  // "I sent it": log the touch, move to Messaged, schedule a 3-day follow-up.
  async function onMarkSent(channel) {
    setSaving(true)
    setErr(null)
    try {
      const created = await addActivity(id, channel, draft ? draft.slice(0, 280) : 'First message sent')
      if (created) setActivities((a) => [created, ...a])
      const nowIso = new Date().toISOString()
      const next = new Date(Date.now() + 3 * 86400000).toISOString()
      const fields = {
        pipeline_stage: 'messaged',
        next_followup_at: next,
        interaction_count: (Number(lead.interaction_count) || 0) + 1,
      }
      const updated = await updateLead(id, fields)
      setStage('messaged')
      setFollowup(next.slice(0, 10))
      onUpdated({ ...lead, ...fields, last_contacted_at: nowIso, ...(updated || {}) })
    } catch (e) {
      setErr(e.message || 'Could not mark as sent')
    } finally {
      setSaving(false)
    }
  }

  async function onAddActivity(e) {
    e.preventDefault()
    if (!actText.trim() && actType === 'note') return
    setSaving(true)
    setErr(null)
    try {
      const created = await addActivity(id, actType, actText.trim())
      if (created) setActivities((a) => [created, ...a])
      setActText('')
      // Real touches bump last_contacted_at server-side; reflect that locally.
      if (['call', 'email', 'meeting'].includes(actType)) {
        const nowIso = new Date().toISOString()
        onUpdated({ ...lead, last_contacted_at: nowIso })
      }
    } catch (e) {
      setErr(e.message || 'Could not add activity')
    } finally {
      setSaving(false)
    }
  }

  const name = leadName(lead)

  return (
    <div className="fixed inset-0 z-30 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      {/* Panel */}
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-line/60 bg-panel shadow-2xl animate-[slideIn_.18s_ease-out]">
        <style>{`@keyframes slideIn{from{transform:translateX(24px);opacity:.4}to{transform:translateX(0);opacity:1}}`}</style>

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line/60 bg-panel/95 px-5 py-4 backdrop-blur">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-extrabold text-ink">{lead.business_name}</h3>
            <div className="text-xs text-muted">
              {[titleize(lead.business_type), [lead.city, lead.state].filter(Boolean).join(', ')]
                .filter((s) => s && s !== '—')
                .join(' · ')}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-line/60 px-2 py-1 text-sm text-muted hover:border-accent/50 hover:text-accent"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          {err && (
            <div className="rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-xs text-bad">
              {err}
            </div>
          )}

          {/* Pipeline stage */}
          <Field label="Pipeline Stage">
            <select
              value={stage}
              onChange={(e) => onStageChange(e.target.value)}
              disabled={saving}
              className="input"
            >
              {STAGES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>

          {/* First message — drafted by the lead agent, edited and sent by Nour */}
          <Section
            title="First Message"
            action={
              <button onClick={onSaveDraft} disabled={saving} className="link-btn">
                Save
              </button>
            }
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={7}
              placeholder="No draft yet. The morning lead run fills this in, or write your own."
              className="input resize-y text-sm"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={onCopyDraft} disabled={!draft} className="btn">
                {copied ? 'Copied ✓' : 'Copy'}
              </button>
              {mailtoFor({ ...lead, draft_message: draft }) && (
                <a href={mailtoFor({ ...lead, draft_message: draft })} className="btn">
                  Open in Email
                </a>
              )}
              {lead.linkedin_url && (
                <a href={ensureHttp(lead.linkedin_url)} target="_blank" rel="noreferrer" className="btn">
                  Open LinkedIn
                </a>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => onMarkSent('email')}
                disabled={saving}
                className="btn flex-1 justify-center"
                style={{ backgroundColor: '#16A34A22', color: '#16A34A' }}
              >
                Mark sent · Email
              </button>
              <button
                onClick={() => onMarkSent('linkedin')}
                disabled={saving}
                className="btn flex-1 justify-center"
                style={{ backgroundColor: '#60A5FA22', color: '#60A5FA' }}
              >
                Mark sent · LinkedIn
              </button>
            </div>
            <div className="mt-1 text-[11px] text-muted">
              Marking sent moves this contact to Messaged and sets a follow-up in 3 days.
            </div>
          </Section>

          {/* Fit */}
          <Section
            title="Fit"
            action={
              <button onClick={onSaveFit} disabled={saving} className="link-btn">
                Save
              </button>
            }
          >
            <div className="mb-2">
              <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted">Warm or cold</label>
              <select
                value={fit.warm_or_cold}
                onChange={(e) => setFit((f) => ({ ...f, warm_or_cold: e.target.value }))}
                className="input"
              >
                <option value="">—</option>
                <option value="warm">Warm (knows me)</option>
                <option value="cold">Cold</option>
              </select>
            </div>
            <div className="mb-1">
              <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted">Mutual connection</label>
              <input
                value={fit.mutual_connection}
                onChange={(e) => setFit((f) => ({ ...f, mutual_connection: e.target.value }))}
                placeholder="Who can introduce you"
                className="input"
              />
            </div>
            <div className="mb-1">
              <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted">Deal value (USD, when won)</label>
              <input
                type="number"
                value={fit.deal_value_usd}
                onChange={(e) => setFit((f) => ({ ...f, deal_value_usd: e.target.value }))}
                placeholder="3500"
                className="input"
              />
            </div>
            <Info label="Source" value={lead.source || '—'} />
          </Section>

          {/* Contact info */}
          <Section title="Contact">
            <Info label="Contact name" value={name || '—'} />
            <Info label="Title" value={lead.contact_title || '—'} />
            <Info
              label="Email"
              value={
                lead.contact_email ? (
                  <a className="text-accent2 hover:underline" href={`mailto:${lead.contact_email}`}>
                    {lead.contact_email}
                  </a>
                ) : (
                  '—'
                )
              }
            />
            <Info
              label="Phone"
              value={
                lead.phone ? (
                  <a className="text-ink hover:text-accent" href={`tel:${lead.phone}`}>
                    {lead.phone}
                  </a>
                ) : (
                  '—'
                )
              }
            />
            <Info
              label="Website"
              value={
                lead.website ? (
                  <a
                    className="text-accent2 hover:underline"
                    href={ensureHttp(lead.website)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {lead.website}
                  </a>
                ) : (
                  '—'
                )
              }
            />
            <Info
              label="Address"
              value={[lead.address, lead.city, lead.state, lead.zip].filter(Boolean).join(', ') || '—'}
            />
            <Info
              label="Rating"
              value={
                lead.google_rating
                  ? `${lead.google_rating}★ (${lead.review_count || 0} reviews)`
                  : '—'
              }
            />
            <Info label="Tier" value={titleize(lead.lead_tier)} />
          </Section>

          {/* Social links — editable */}
          <Section
            title="Social Links"
            action={
              <button onClick={onSaveSocial} disabled={saving} className="link-btn">
                Save
              </button>
            }
          >
            {[
              ['linkedin_url', 'LinkedIn'],
              ['facebook_url', 'Facebook'],
              ['instagram_url', 'Instagram'],
            ].map(([key, label]) => (
              <div key={key} className="mb-2">
                <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted">
                  {label}
                </label>
                <input
                  value={social[key]}
                  onChange={(e) => setSocial((s) => ({ ...s, [key]: e.target.value }))}
                  placeholder={`${label} URL`}
                  className="input"
                />
              </div>
            ))}
          </Section>

          {/* Follow-up date */}
          <Field
            label="Next Follow-up"
            action={
              <button onClick={onSaveFollowup} disabled={saving} className="link-btn">
                Save
              </button>
            }
          >
            <input
              type="date"
              value={followup}
              onChange={(e) => setFollowup(e.target.value)}
              className="input"
            />
            <div className="mt-1 text-xs text-muted">
              Last contacted: {shortDate(lead.last_contacted_at)}
            </div>
          </Field>

          {/* Notes */}
          <Field
            label="Notes"
            action={
              <button onClick={onSaveNotes} disabled={saving} className="link-btn">
                Save
              </button>
            }
          >
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Outreach notes…"
              className="input resize-y"
            />
          </Field>

          {/* Add activity */}
          <Section title="Log Activity">
            <form onSubmit={onAddActivity} className="space-y-2">
              <div className="flex gap-2">
                <select
                  value={actType}
                  onChange={(e) => setActType(e.target.value)}
                  className="input w-36 shrink-0"
                >
                  {ACTIVITY_TYPES.map((a) => (
                    <option key={a.key} value={a.key}>
                      {a.icon} {a.label}
                    </option>
                  ))}
                </select>
                <input
                  value={actText}
                  onChange={(e) => setActText(e.target.value)}
                  placeholder="What happened?"
                  className="input flex-1"
                />
              </div>
              <button type="submit" disabled={saving} className="btn w-full justify-center">
                {saving ? 'Saving…' : 'Add Activity'}
              </button>
            </form>
          </Section>

          {/* Timeline */}
          <Section title={`Activity Timeline${activities.length ? ` (${activities.length})` : ''}`}>
            {loadingActs ? (
              <div className="py-4 text-center text-xs text-muted">Loading…</div>
            ) : activities.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted">No activity logged yet.</div>
            ) : (
              <ol className="space-y-3">
                {activities.map((a) => {
                  const meta = ACTIVITY_BY_KEY[a.activity_type]
                  return (
                    <li key={a.id} className="flex gap-3">
                      <div className="mt-0.5 text-base leading-none">{meta?.icon || '•'}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-ink">
                            {meta?.label || titleize(a.activity_type)}
                          </span>
                          <span className="shrink-0 text-[11px] text-muted">
                            {relativeTime(a.created_at)}
                          </span>
                        </div>
                        {a.description && (
                          <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-ink/80">
                            {a.description}
                          </p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </Section>
        </div>
      </div>
    </div>
  )
}

function Field({ label, action, children }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-accent">
          {label}
        </label>
        {action}
      </div>
      {children}
    </div>
  )
}

function Section({ title, action, children }) {
  return (
    <div className="rounded-lg border border-line/50 bg-panel2/30 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-accent">{title}</div>
        {action}
      </div>
      {children}
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line/20 py-1.5 last:border-0">
      <span className="text-xs text-muted">{label}</span>
      <span className="max-w-[60%] break-words text-right text-sm text-ink/90">{value}</span>
    </div>
  )
}

function toDateInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  return d.toISOString().slice(0, 10)
}

function ensureHttp(url) {
  if (!url) return url
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}
