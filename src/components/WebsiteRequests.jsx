import { Card } from './ui'
import { num, shortDate } from '../lib/format'

export default function WebsiteRequests({ website }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card>
        <div className="text-xs uppercase tracking-wider text-muted">Consultation Requests</div>
        <div className="mt-1 text-3xl font-extrabold text-accent">{num(website.contactCount)}</div>
        <div className="mt-1 text-xs text-muted">in the website_consultation_requests table</div>
      </Card>

      <Card className="lg:col-span-2">
        <div className="mb-2 text-sm font-semibold text-ink">Recent Requests</div>
        {website.recent.length > 0 ? (
          <div className="space-y-2">
            {website.recent.map((c) => (
              <div
                key={c.id || c.email || Math.random()}
                className="flex items-center justify-between border-b border-line/30 pb-2 text-sm"
              >
                <div>
                  <div className="font-medium text-ink">{c.name || c.full_name || c.email || 'Request'}</div>
                  <div className="text-xs text-muted">
                    {c.email || c.company || c.message || '—'}
                  </div>
                </div>
                <div className="text-xs text-muted">{shortDate(c.created_at)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-line/50 bg-panel2/40 p-4 text-sm text-muted">
            No rows in the{' '}
            <code className="text-accent2">website_consultation_requests</code> table yet. The
            marketing site (aces-website) writes the OSHA scorecard request and consultation form
            submissions straight into Supabase, so new entries will appear here automatically.
          </div>
        )}
      </Card>
    </div>
  )
}
