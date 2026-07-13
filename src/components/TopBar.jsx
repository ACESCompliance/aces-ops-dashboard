import { relativeTime } from '../lib/format'

export default function TopBar({ onRefresh, loading, fetchedAt }) {
  return (
    <header className="sticky top-0 z-10 border-b border-line/60 bg-bg/80 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/40 bg-accent/10">
            <span className="text-lg font-extrabold text-accent">A</span>
          </div>
          <div>
            <div className="text-base font-extrabold leading-tight tracking-tight text-ink">
              ACES <span className="text-accent">Ops</span>
            </div>
            <div className="text-[11px] text-muted">Compliance Systems · founder dashboard</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted sm:inline">
            {fetchedAt ? `Updated ${relativeTime(fetchedAt)}` : ''}
          </span>
          <button className="btn" onClick={onRefresh} disabled={loading}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={loading ? 'animate-spin' : ''}
            >
              <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
            </svg>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>
    </header>
  )
}
