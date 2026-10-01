# Overnight report

Every task is on its own branch, cut from the `main` of that moment (`2535bac` plus the later backend commits), pushed to `origin`.
Nothing was pushed to `main`, deployed or applied; no migration was run; the live Supabase was only read with SELECTs;
Retell, Twilio, Resend and OpenAI were never called (mocks only). The Retell prompt and all dashboard settings are untouched.

| Task | Branch | State |
|---|---|---|
| 1 Security review | none (report only) | done; the findings are in `security-review.local.md` at the repo root of the working copy (git-ignored, never committed) |
| (extra, from task 1) Hotfix | `overnight/hotfix-demo-header` | done, **review first** |
| 2 Never lose a call | `overnight/call-path` | done |
| 3 Landing QA | `overnight/landing-qa` | done |
| 4 Notify links | `overnight/notify-links` | done |
| 5 Login email per language | `overnight/auth-emails` | done (docs) |
| 6 Copy review | `overnight/copy-review` | done (docs) |
| 7 Repo instructions | `overnight/claude-md` | done |

## What I would review first, in this order

1. **`overnight/hotfix-demo-header`**: a small fix to how the demo switch is treated outside the dashboard pages. Details are in the local security file. Two files (`frontend/proxy.ts`, `frontend/app/api/support/route.ts`). Build and typecheck pass; verified by hand against a local server. Merge soon.
2. **`overnight/call-path`**: the most important behaviour change. **Apply `supabase/migrations/014_calls_retell_call_id_unique.sql` first** (the column and a plain index already exist live; there are 10 calls, none with a Retell id, so no duplicates can block the unique index; the file contains the check query). Do not merge the older branch `call-analyzed-sentiment`: this branch contains a newer version of the same call_analyzed handling and the two would conflict in `webhooks.py`.
3. `overnight/notify-links`, then the rest.

## Task by task

### Hotfix (`overnight/hotfix-demo-header`)
- `proxy.ts` now runs on every route except static assets and strips the demo header everywhere but its own `/demo` rewrite; routes that need no session are forwarded without the Supabase call. `/api/support` also refuses any request carrying the header.
- Tests: `tsc`, `next build`; manual requests against a local server (`/demo/*`, `/`, `/login`, static files, `/dashboard` signed out, `/api/support` with and without the header).
- Risk: the proxy now sees more requests (cheap early return); the matcher excludes `/_next`, icons, `tour/`, `business/` and common asset extensions.

### Task 2 (`overnight/call-path`)
- `call_ended` now: verify signature, parse, filter (unchanged), find the business, **insert a minimal `needs_review` row** (Retell call id, transcript, caller number, duration, disconnection reason, sentiment if present), answer, then **extract + UPDATE the same row + booking + owner email in the background** (FastAPI `BackgroundTasks`). A retried call_ended finds the row by `retell_call_id` and returns `duplicate`: no second row, booking, extraction or email. If the first insert fails the webhook errors so Retell retries.
- Extraction has a 25 s timeout with one retry; any failure leaves the row `needs_review` and keeps the "failed extraction emails the owner" rule. Urgent-only emails unchanged.
- `call_analyzed` updates `user_sentiment` on the matching row only, never inserts, retries a few times if it beats call_ended, otherwise ignores quietly.
- Malformed signed payloads are acknowledged with 200 (retrying the same bytes cannot help).
- New: `backend/app/services/call_ingest.py`, `backend/scripts/reprocess_needs_review.py` (dry run by default, `--apply` to write, never emails, **not run**), migration 014, 23 new tests (`tests/test_call_ingest.py`, `tests/fakes.py`): duplicate delivery, racing inserts, extraction failure, timeout or crash, DB errors, missing fields, null urgency, "null" strings, call_analyzed before call_ended and without a match, malformed payloads, unsigned requests, the response not waiting for the extraction, and the script's dry run.
- Tests run: 50 backend tests, all pass (`python -m unittest discover -s tests`).
- Background tasks are safe here because the backend is a long-running uvicorn process (Railway). On a serverless host this would need a queue. If the process is killed mid-extraction the row stays `needs_review` and the reprocess script finishes it.
- Risks: `created_at` is the insert time (unchanged in meaning); the booking and the urgent email now come a few seconds after the 200 instead of before it.

### Task 3 (`overnight/landing-qa`)
- Report: `docs/landing-qa.md` (seven viewports, EN/ES/FR, tour, demo, voice, language, meta).
- Fixed (objective only): hero paragraph clipped at 320px (grid `1fr` to `minmax(0,1fr)`), `<html lang>` now follows the language switch, canonical URL on `/` only, `theme-color`.
- Left and listed: small tap targets, tour screenshots 1440px wide on phones (a `srcset` would cut about 70% of image weight), English-only title and description. No design or copy changed.
- Verified with production builds in headless Chrome; lint at baseline (21).

### Task 4 (`overnight/notify-links`)
- After Confirm / Cancel / Change in the calendar: "Notify the caller?" with Open SMS, Open WhatsApp, Skip. Message pre-written in the business language (en/es/fr) with the business name and date/time (business timezone), separate texts for confirmed, cancelled, changed. Hidden without a usable phone; WhatsApp also needs an international number. Disabled in the demo. Keys added to `dash-i18n.ts` (en/es/fr).
- "Changed" is interpreted as: a booking that was already settled and is switched to the other state through the existing Change button (there is no reschedule feature). The text says what it is now. If you wanted "moved to another time", that needs a reschedule flow first.
- Tests: 10 new (`frontend/tests/notify-message.test.ts`, `npm test`, Node's built-in runner, no new dependency; `tsconfig` gained `allowImportingTsExtensions`); typecheck, lint baseline, build; the whole flow driven in a real browser against a mock Supabase in French and Spanish (phone width too).
- Risk: message wording should be read by a native speaker (see the copy review).

### Task 5 (`overnight/auth-emails`, docs only)
- `docs/auth-email-templates.md`: one Magic Link template (subject, HTML, text) branching on `user_metadata.language` with an English fallback, the SQL to copy `businesses.language` onto auth users (not run), an optional sync trigger, exact dashboard steps.
- Not rendered with Go locally (no toolchain); the doc says so and gives a step-by-step test.

### Task 6 (`overnight/copy-review`, docs only)
- `docs/copy-review.md`: mechanical issues (French non-breaking spaces, apostrophes, 24/7 notation, "Desliza", "Party size", sender address), inconsistent terms, about 25 line-level suggestions, notes on dead strings. No copy changed.

### Task 7 (`overnight/claude-md`)
- New root `CLAUDE.md` (69 lines): rules, how to run tests, architecture map, pitfalls (RLS without GRANT, `.single()`, hardcoded timezones, prefetch overwriting the remembered page, the trusted demo header, Retell retries). Lines about code that lives on other branches are marked with `*`. `.gitignore` now ignores `*.local.md`.

## Skipped
Nothing was skipped.

## Things I could not verify
- The Retell inbound webhook's signing (the docs are silent) and `call_analyzed` against a real payload.
- The Go template for the login email.
- Real-device behaviour of `sms:` and `wa.me` links (checked as generated links only).
