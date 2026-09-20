# CivicFix — Intelligent Citizen Grievance Triage, Deduplication & Accountability (PS-18)

A production-style civic grievance platform. Citizens report issues with photos + GPS pins;
Gemini AI (with deterministic fallback) classifies, scores priority, detects duplicates and routes
each report to the right department. Officers manage a prioritized command center through to
resolution with before/after evidence, and citizens verify fixes.

## Quick start

```bash
npm install
cp .env.example .env   # fill in Supabase + optional Gemini key
npm run build
```

Deploy to Vercel — API routes live in `api/` (serverless functions), the React SPA in `src/`.

## Demo accounts

| Role    | Email               | Password   |
|---------|---------------------|------------|
| Citizen | citizen@civicfix.in | citizen123 |
| Officer | officer@civicfix.in | officer123 |

Officer self-registration requires the access code in `OFFICER_ACCESS_CODE`
(default `CIVIC-OFFICER-2026` — change in production).

## Key flows

- **Report** (`/report`): 4-step wizard → live AI triage → duplicate preview → submit →
  auto-linked to an existing Civic Issue (similarity ≥ 0.62) or a new issue is created.
- **Citizen dashboard** (`/dashboard`): track complaints, timeline, verify/reopen resolutions.
- **Command center** (`/officer`): priority queue, search/filter, one-click AI reprioritization.
- **Issue details** (`/issues/:id`): assign officers, notes, status workflow, dedup inspector +
  merge, resolution with before/after evidence, audit trail.
- **Maps** (`/city-map`, `/officer/map`): Leaflet + OpenStreetMap with category/priority/status filters.
- **Analytics** (`/officer/analytics`): SLA scoreboard, trends, priority mix, hotspots.

## AI engine (`api/triage-ai.js` + `api/_lib.js`)

1. **Classify** into 9 categories with severity (1–5), department, summary, confidence.
2. **Priority score** (0–100): severity 30 + duplicates 20 + affected 15 + safety 20 + location 10 + age 5.
3. **Duplicates**: 0.55·text + 0.25·geo + 0.20·category; duplicates link, never delete.
4. **Gemini first**, 12s timeout → deterministic keyword engine fallback (zero downtime).

Set `GEMINI_API_KEY` (server env) to enable Gemini; without it the fallback engine runs.

## Data model (Supabase Postgres)

`profiles` · `complaints` · `civic_issues` · `complaint_issue_links` · `assignments` ·
`resolutions` · `audit_logs`, plus the `evidence` storage bucket (public, 5MB, images only).

Auth: Supabase Auth (email + Google). Officers gated by access code + RLS policies.
