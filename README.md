# ACES Ops Dashboard

Single-user founder ops dashboard for **ACES Compliance Systems**. Password-gated,
dark navy + orange brand theme, React + Vite + Tailwind, charts via Recharts.

## Architecture

The audit app's tables (`app_*`) use row-level security that requires an
authenticated site membership, so the public anon key returns nothing. Instead
of weakening RLS, this dashboard reads through a **Netlify Function**
(`netlify/functions/data.mjs`) that queries Supabase with the **service-role
key server-side**. The privileged key never ships to the browser; the frontend
just fetches `/api/data`.

```
Browser (password gate)  ──fetch──>  /api/data (Netlify fn, service role)  ──>  Supabase
```

## Sections

1. Metrics row — audits completed, active sites, leads, outreach-ready, OSHA standards
2. Audit activity — recent audits, penalty exposure, severity breakdown, corrective actions
3. Lead pipeline — `aces_compliance_leads` by tier / email quality / status, last-7-days
4. Geographic breakdown — sites & leads by state, top lead cities
5. n8n workflow health — `aces_workflow_runs`, Apollo/Hunter budget, pipeline health light
6. Website / consultation requests — `contacts` table (see note below)
7. App health monitor — live Supabase probe latencies, data freshness, build/deploy stamp
8. Actions generated — corrective actions with status tracking

> **Consultation requests:** the marketing site (`aces-website`) currently captures
> its scorecard/consultation forms via **Netlify Forms**, not Supabase, so the
> `contacts` table is empty. Point that form at `contacts` and submissions show up here.

## Environment (server-side only)

Set on Netlify — never committed:

```bash
netlify env:set SUPABASE_URL "https://wuwdmqkblrbigdoehbrv.supabase.co"
netlify env:set SUPABASE_SERVICE_ROLE_KEY "<service-role-key>"
netlify env:set OPS_PASSWORD "aces2026"   # optional gate on the data endpoint
```

## Local dev

```bash
npm install
netlify dev      # runs Vite + the function together at http://localhost:8888
```

Plain `npm run dev` serves the UI but the `/api/data` function won't run — use
`netlify dev`.

## Deploy

```bash
npm run build
netlify deploy --prod
```

Password: `aces2026`.
