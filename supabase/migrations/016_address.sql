-- The visit address the caller gives (street and town, exactly as said), stored on the
-- call and on the booking made from it. For a trades business it is the key field.
--
-- NOT APPLIED. Review it, then apply it yourself in the Supabase SQL editor.
-- Apply it BEFORE deploying the backend that writes "address": until the columns exist
-- every UPDATE of a call (and every booking insert) that includes it fails, and the call
-- stays "needs_review" without its extraction.
--
-- Everything here is idempotent ("if not exists" / "or replace" / grants), so a second
-- run changes nothing.

-- 1. The columns: nullable text, no default. Existing rows simply have no address.
alter table public.calls    add column if not exists address text;
alter table public.bookings add column if not exists address text;

-- 2. Grants. The dashboard role (authenticated) reads calls and bookings under RLS with
--    table-level SELECT, which already covers new columns; the column-level grant below
--    is the same permission stated per column, so the new column stays readable even if
--    the table-level SELECT is ever narrowed to column grants (as security-review.local.md
--    proposes). It is a no-op today.
--    Deliberately NOT granted: INSERT/UPDATE on address to authenticated. The backend
--    (service_role) is the only writer, so the owner's UPDATE rights (status, translations,
--    ...) are untouched, and anon gets nothing.
grant select (address) on public.calls    to authenticated;
grant select (address) on public.bookings to authenticated;

-- 3. Retention. An address is personal data, so the 90-day anonymisation job (003) has to
--    clear it like the name, phone and notes. This is 003's function with one added line
--    per table (marked "address"). 015 hardened it live (revoked EXECUTE from API roles
--    and pinned its search_path), and CREATE OR REPLACE would drop that search_path, so
--    both are restated here.
create or replace function public.anonymize_old_call_data()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_calls_count integer;
    v_bookings_count integer;
begin
    with updated as (
        update calls
        set caller_name    = null,
            caller_phone   = null,
            transcript     = null,
            summary        = null,
            intent         = null,
            preferred_time = null,
            notes          = null,
            address        = null,   -- address
            raw_payload    = '{}'::jsonb
        where created_at < now() - interval '90 days'
          and (
            caller_name is not null or caller_phone is not null or
            transcript is not null or summary is not null or
            intent is not null or preferred_time is not null or
            notes is not null or address is not null or   -- address
            raw_payload <> '{}'::jsonb
          )
        returning id
    )
    select count(*) into v_calls_count from updated;

    with updated as (
        update bookings
        set customer_name  = null,
            customer_phone = null,
            notes          = null,
            address        = null    -- address
        where coalesce(start_time, created_at) < now() - interval '90 days'
          and (
            customer_name is not null or customer_phone is not null or
            notes is not null or address is not null      -- address
          )
        returning id
    )
    select count(*) into v_bookings_count from updated;

    insert into retention_job_log (calls_anonymized, bookings_anonymized)
    values (v_calls_count, v_bookings_count);
end;
$$;

revoke execute on function public.anonymize_old_call_data() from public, anon, authenticated;
