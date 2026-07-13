import { useCallback, useEffect, useState } from 'react'
import Login from './components/Login'
import TopBar from './components/TopBar'
import MetricsRow from './components/MetricsRow'
import AuditActivity from './components/AuditActivity'
import LeadPipeline from './components/LeadPipeline'
import GeoBreakdown from './components/GeoBreakdown'
import WorkflowHealth from './components/WorkflowHealth'
import WebsiteRequests from './components/WebsiteRequests'
import AppHealth from './components/AppHealth'
import ActionsGenerated from './components/ActionsGenerated'
import CRM from './components/crm/CRM'
import { SectionHeader } from './components/ui'
import { isAuthed } from './lib/auth'
import { fetchData } from './lib/api'
import { derive } from './lib/derive'

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'crm', label: 'CRM' },
]

export default function App() {
  const [authed, setAuthed] = useState(isAuthed())
  const [tab, setTab] = useState('dashboard')
  const [data, setData] = useState(null)
  const [fetchedAt, setFetchedAt] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const raw = await fetchData()
      setData(derive(raw))
      setFetchedAt(raw.fetchedAt)
    } catch (e) {
      console.error(e)
      setError(e.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authed) refresh()
  }, [authed, refresh])

  if (!authed) return <Login onSuccess={() => setAuthed(true)} />

  return (
    <div className="min-h-screen">
      <TopBar onRefresh={refresh} loading={loading} fetchedAt={fetchedAt} />

      {/* Primary navigation */}
      <nav className="sticky top-[57px] z-[5] border-b border-line/60 bg-bg/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] gap-1 px-4 md:px-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative px-4 py-3 text-sm font-semibold transition-colors ${
                tab === t.key ? 'text-accent' : 'text-muted hover:text-ink'
              }`}
            >
              {t.label}
              {tab === t.key && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />
              )}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-[1400px] space-y-8 px-4 py-6 md:px-6">
        {tab === 'crm' && <CRM />}

        {tab === 'dashboard' && (
        <>
        {error && (
          <div className="rounded-lg border border-bad/40 bg-bad/10 px-4 py-3 text-sm text-bad">
            <strong>Couldn’t load data:</strong> {error}
            <div className="mt-1 text-xs text-muted">
              Make sure the Netlify function has SUPABASE_SERVICE_ROLE_KEY set. Locally, run with{' '}
              <code>netlify dev</code>.
            </div>
          </div>
        )}

        {!data && loading && (
          <div className="py-24 text-center text-muted">Loading ACES ops data…</div>
        )}

        {data && (
          <>
            <section>
              <SectionHeader>Metrics</SectionHeader>
              <MetricsRow m={data.metrics} />
            </section>

            <section>
              <SectionHeader>Audit Activity</SectionHeader>
              <AuditActivity a={data.auditActivity} />
            </section>

            <section>
              <SectionHeader>Lead Pipeline</SectionHeader>
              <LeadPipeline p={data.leadPipeline} />
            </section>

            <section>
              <SectionHeader>Geographic Breakdown</SectionHeader>
              <GeoBreakdown geo={data.geo} />
            </section>

            <section>
              <SectionHeader>n8n Workflow Health</SectionHeader>
              <WorkflowHealth w={data.workflow} />
            </section>

            <section>
              <SectionHeader>Website · Consultation Requests</SectionHeader>
              <WebsiteRequests website={data.website} />
            </section>

            <section>
              <SectionHeader>App Health Monitor</SectionHeader>
              <AppHealth health={data.health} workflow={data.workflow} fetchedAt={fetchedAt} />
            </section>

            <section>
              <SectionHeader>Actions Generated</SectionHeader>
              <ActionsGenerated actions={data.actions} />
            </section>
          </>
        )}
        </>
        )}

        <footer className="pt-4 text-center text-xs text-muted">
          ACES Compliance Systems · ops dashboard · single-user
        </footer>
      </main>
    </div>
  )
}
