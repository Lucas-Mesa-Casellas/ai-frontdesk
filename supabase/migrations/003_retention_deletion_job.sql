-- AI Front Desk - Retention enforcement (90-day anonymization)
-- Implements the retention decision in Master Paper v9 §7:
--   detailed personal data -> 90 days
--   aggregate call-count stats -> unlimited
-- Approach: anonymize in place (null the PII columns, keep the row) so
-- aggregate counts survive forever while personal detail does not.
-- Applied live via Supabase SQL Editor, matching 002_schema_sync.sql practice.

-- 1. pg_cron (in-database scheduler, no new network-facing endpoint)
create extension if not exists pg_cron;

-- 2. Audit log so the job's own output can be checked, not assumed.
-- ("verify at the destination, never at the delivery" - Master Paper §13)
create table if not exists retention_job_log (
    id uuid primary key default gen_random_uuid(),
    run_at timestamptz not null default now(),
    calls_anonymized integer not null,
    bookings_anonymized integer not null
);

-- RLS on immediately - new tables get security designed in, not added later.
-- No policies = only service_role (which bypasses RLS) can read this.
-- No anon/authenticated access at all.
alter table retention_job_log enable row level security;

-- 3. The job itself
create or replace function anonymize_old_call_data()
returns void
language plpgsql
security definer
as $$
declare
    v_calls_count integer;
    v_bookings_count integer;
begin
    -- CALLS: clock runs from created_at. A call is a closed, one-time event
    -- the moment it ends, so there is no "future call" case to protect.
    with updated as (
        update calls
        set caller_name    = null,
            caller_phone   = null,
            transcript     = null,
            summary        = null,
            intent         = null,
            preferred_time = null,
            notes          = null,
            raw_payload    = '{}'::jsonb
        where created_at < now() - interval '90 days'
          and (
            caller_name is not null or caller_phone is not null or
            transcript is not null or summary is not null or
            intent is not null or preferred_time is not null or
            notes is not null or raw_payload <> '{}'::jsonb
          )
        returning id
    )
    select count(*) into v_calls_count from updated;

    -- BOOKINGS: clock runs from the APPOINTMENT date (start_time), not the
    -- booking date. A booking made today for a visit in October must keep
    -- the customer's name/phone until the visit happens, not 90 days after
    -- it was booked. Falls back to created_at only if start_time was never
    -- set (e.g. an open callback with no fixed time).
    with updated as (
        update bookings
        set customer_name  = null,
            customer_phone = null,
            notes          = null
        where coalesce(start_time, created_at) < now() - interval '90 days'
          and (
            customer_name is not null or customer_phone is not null or
            notes is not null
          )
        returning id
    )
    select count(*) into v_bookings_count from updated;

    insert into retention_job_log (calls_anonymized, bookings_anonymized)
    values (v_calls_count, v_bookings_count);
end;
$$;

-- 4. Schedule: daily at 03:00 UTC (low-traffic hour).
-- Guard against duplicate jobs if this script is ever re-run.
do $$
begin
    if exists (select 1 from cron.job where jobname = 'anonymize-old-data-daily') then
        perform cron.unschedule('anonymize-old-data-daily');
    end if;
end;
$$;

select cron.schedule(
    'anonymize-old-data-daily',
    '0 3 * * *',
    $$select anonymize_old_call_data();$$
);
