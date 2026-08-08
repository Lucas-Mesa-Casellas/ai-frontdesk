-- AI Front Desk - Schema sync + RLS consolidation
-- Brings 001_initial.sql up to date with live drift, and closes the
-- missing UPDATE policy on businesses (silent-save bug).
-- Applied live via Supabase SQL Editor, 30 Jul 2026.

-- 1. Columns that exist live but were missing from 001_initial.sql
alter table businesses add column if not exists owner_id uuid references auth.users(id);
alter table businesses add column if not exists retell_agent_id text;

alter table calls add column if not exists booking_type text;
alter table calls add column if not exists party_size integer;
alter table calls add column if not exists raw_payload jsonb not null default '{}'::jsonb;
alter table calls add column if not exists ai_extracted_at timestamptz;
alter table calls add column if not exists extraction_complete boolean not null default false;
alter table calls add column if not exists extraction_confidence numeric;
alter table calls add column if not exists missing_fields jsonb not null default '[]'::jsonb;
alter table calls add column if not exists notes text;

-- 2. RLS on (idempotent)
alter table businesses enable row level security;
alter table calls enable row level security;
alter table bookings enable row level security;

-- 3. Consolidate duplicate SELECT policies (byte-identical qual, confirmed
-- via pg_policies, 30 Jul 2026)
drop policy if exists "Owners see only their own business" on businesses;
drop policy if exists "Owners see only their own calls" on calls;
drop policy if exists "Owners see only their own bookings" on bookings;

-- 4. The real fix: businesses had zero UPDATE policies
create policy "owner can update own business"
on businesses for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
