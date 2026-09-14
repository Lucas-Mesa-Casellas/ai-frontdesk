-- AI Front Desk - per-call cached translations
-- calls.summary/notes/next_action are written once at extraction time in
-- business.language (see backend/app/services/ai.py) -- this is correct
-- and must stay untouched, since it's also what notify.py's emails use.
-- When the dashboard is viewed in a DIFFERENT language than the business's
-- own, a translation is generated on demand and cached here, keyed by
-- target locale, so a given call is ever translated into a given
-- language at most once.
--
-- Shape: {"en": {"summary": "...", "notes": "...", "next_action": "...",
-- "transcript": "..."}, "fr": {...}}. "transcript" only appears once a
-- user explicitly requests it (manual, never automatic -- it's a literal
-- record of what was said).
alter table calls add column if not exists translations jsonb not null default '{}'::jsonb;

-- Needed so the dashboard, using the viewer's own authenticated session
-- (not a service-role key), can write a freshly-generated translation
-- into the cache. calls had no UPDATE policy at all before this -- same
-- ownership check as "owner can confirm own bookings" (see
-- 004_rls_policy_sync.sql): restricted to the caller's own business, no
-- cross-tenant access.
drop policy if exists "owner can update own calls" on calls;
create policy "owner can update own calls"
on calls for update
using (
    business_id in (
        select businesses.id from businesses
        where businesses.owner_id = auth.uid()
    )
)
with check (
    business_id in (
        select businesses.id from businesses
        where businesses.owner_id = auth.uid()
    )
);
