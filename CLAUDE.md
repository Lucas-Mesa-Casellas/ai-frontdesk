# LMC Agents: working rules for Claude

AI receptionist for small businesses (trades, property management), in English, Spanish and French.
A Retell voice agent answers calls; this repo stores them, extracts what the caller wanted, and shows it
in a client dashboard. **The repo is public**: nothing secret, no real customer data, ever.

## Working rules

- **Branches.** One branch per task, from the latest `main`, named `overnight/<task>` (or `feature/<task>` in a normal session).
  Push only that branch. Merging to `main` is Lucas's decision; push to `main` only when he says so in that session.
- **Done means:** typecheck, lint (no new problems), tests and `npm run build` pass, and the change was looked at in a browser
  (headless Chrome is fine) at phone and desktop widths. Say plainly what was not verified.
- **Migrations are written, never applied.** Put SQL in `supabase/migrations/NNN_name.sql` with `if not exists`. A migration must be
  applied **before** the code that writes the new column is deployed; otherwise inserts fail and calls are lost. Say so in the PR/report.
- **Never deploy, never touch live settings.** No writes or DDL on the live Supabase (SELECT only), no Retell prompt or dashboard
  changes, no calls to Retell, Twilio, Resend or OpenAI from tests (mock them).
- **Fake data only in demos, screenshots and tests.** The sample business is **"LMC Agents"** (hello@lmcagents.example), callers are
  invented people, numbers are reserved or masked (FR 06 39 98 xx xx / 01 99 00 xx xx, UK 07700 900xxx, ES `+34 6•• ••• 482`).
  Never commit a real name, number, email, key or client (the current clients' names stay out of the repo).
- **Reports with findings stay local**: `*.local.md` is git-ignored (for example `security-review.local.md`).
- Do not change copy, design or behaviour the task did not ask for. Copy: natural for a native speaker; see `docs/copy-review.md`.
- Constraint carried from the start: do not alter auth, RLS policies, routes or the language cookie while doing visual work.

## Run and test

- Backend (from `backend/`): `pip install -r requirements.txt`, then `python -m unittest discover -s tests -v`
  (unittest, no network; fakes in `tests/fakes.py`). Run the API: `uvicorn app.main:app`.
- Frontend (from `frontend/`): `npm install`, `npm run dev`, `npx tsc --noEmit`, `npm run lint` (baseline: 21 known problems),
  `npm test`* (Node's built-in runner, `tests/*.test.ts`), `npm run build`.
- Local dashboard without Supabase: point `NEXT_PUBLIC_SUPABASE_URL` in an untracked `.env.local` at a throwaway mock server; a dummy
  `OPENAI_API_KEY` is needed or server actions fail to load. The public demo needs none of this (`/demo`).
- Dev server serves **stale CSS**: stop it and `rm -rf .next` before trusting a screenshot. Remove `.env.local` and `.next` before committing.
- Windows/Git Bash: quotes inside heredocs break; write scripts to a file. Python needs the `tzdata` package (listed in requirements).

## Architecture map

- `frontend/` Next.js 16 (App Router, Turbopack), React 19, GSAP. **Next 16 is not the Next you know**: read `node_modules/next/dist/docs/`.
  - `proxy.ts` (the Next 16 name for middleware): auth gate for `/dashboard`, `/demo` rewrite, `?lang=`, remembered area cookies.
  - `app/page.tsx` server wrapper reads the language; `components/Landing.tsx` is the landing (hero, pricing, contact); `ProductTour.tsx`, `VoiceSamples.tsx`.
  - `app/dashboard/*` real dashboard (server components + Supabase). `app/api/contact`, `app/api/support` send mail via Resend.
  - `lib/dashboard-data.ts` `getAuthedBusiness()` (per-request cache; also returns the demo data in demo mode), `lib/dash-i18n.ts` all dashboard text (en/es/fr),
    `lib/dash-actions.ts` server actions (confirm, cancel, delete), `lib/translate*.ts` on-demand OpenAI translation, `lib/tz.ts` timezone helpers.
  - `lib/demo/*` + `components/demo/*`: the public demo = the real pages rendered from in-memory sample data (`/demo` rewrites to `/dashboard`
    with a header only the proxy may set). `lib/tour-notes.ts`, `lib/tour-hotspots.ts`, `public/tour/*` tour screenshots and audio.
  - `lib/notify-message.ts`* the SMS/WhatsApp texts offered after Confirm/Cancel (pure, tested).
- `backend/` FastAPI on Railway. `app/routers/webhooks.py` Retell webhooks (`/webhooks/retell` call_ended + call_analyzed*, `/webhooks/retell-inbound`),
  `functions.py` live availability check; `services/` `ai.py` (extraction, gpt-4o-mini), `call_ingest.py`* (store first, extract after), `scheduling.py`
  (opening hours, multi-window days), `open_status.py` (is the office open now), `notify.py` (owner emails), `retell_security.py` (signature check).
- `supabase/migrations/` schema history. Tables: `businesses`, `calls`, `bookings`, `retention_job_log`; RLS on all; pg_cron anonymises data older than 90 days.
- External: Retell (voice agent, **its prompt lives in Retell, not here, and is never edited from code**), Resend (mail), Twilio (numbers), OpenAI, Vercel (frontend), Railway (backend).

## Pitfalls we already hit

- **RLS without GRANT.** A policy does nothing if the role has no table privilege. `authenticated` once had no UPDATE on `businesses` (Settings could not save)
  and DELETE on `calls` needed migration 008. Check both when adding a write path.
- **`.single()` in `dashboard-data.ts`.** It errors on zero or several rows, so an owner with no or two business rows silently gets `business = null`.
- **Hardcoded timezones.** `BUSINESS_TZ = "Europe/Madrid"` (frontend `lib/tz.ts`, backend `call_ingest.py`) is wrong for other countries. `businesses.timezone`
  (migration 013) exists and `open_status.py` uses it; migrate the rest before onboarding a non-Madrid business.
- **Prefetch overwrote the remembered page.** Next strips its RSC/prefetch headers before `proxy.ts` sees them, so the proxy records only real
  document loads (`Sec-Fetch-Dest != empty`) and `RememberPlace.tsx` records in-dashboard navigation.
- **Trusted header.** `x-lmc-demo` switches the dashboard to fake data. It must be stripped on every route the proxy does not rewrite (the matcher covers
  all non-static paths*) and `/api/support` refuses it*; never read it anywhere a real session matters.
- **Retell retries.** call_ended can arrive twice; store a stub row first and dedupe on `retell_call_id` (unique index, migration 014*).
- Server actions run one at a time per tab (batch work into one action). In component `<style>` blocks, media queries must come after the base rules.
- `getLocale()` falls back to the business language; the landing language is the `lmc_locale` cookie (`?lang=` sets it).
- The dashboard must never be framable (`X-Frame-Options: DENY`); only `/demo` allows `SAMEORIGIN`.

\* exists only once the `overnight/*` branches (call-path, notify-links, hotfix-demo-header) are merged.
