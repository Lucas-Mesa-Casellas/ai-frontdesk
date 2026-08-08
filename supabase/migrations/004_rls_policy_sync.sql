-- AI Front Desk - RLS policy sync
-- 002_schema_sync.sql dropped 3 SELECT policies (as duplicates) and added
-- only one UPDATE policy back. It never recreated the SELECT policies, or
-- the bookings UPDATE policy that confirmBooking relies on.
-- Those 4 policies exist LIVE (confirmed via pg_policies, 08 Aug 2026) but
-- were missing from every migration file -- this migration is written to
-- match the live definitions exactly, not to change behavior.
-- Idempotent: safe to run even though the policies already exist live.

drop policy if exists "owner can read own business" on businesses;
create policy "owner can read own business"
on businesses for select
using (owner_id = auth.uid());

drop policy if exists "owner can read own bookings" on bookings;
create policy "owner can read own bookings"
on bookings for select
using (
    business_id in (
        select businesses.id from businesses
        where businesses.owner_id = auth.uid()
    )
);

drop policy if exists "owner can confirm own bookings" on bookings;
create policy "owner can confirm own bookings"
on bookings for update
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

drop policy if exists "owner can read own calls" on calls;
create policy "owner can read own calls"
on calls for select
using (
    business_id in (
        select businesses.id from businesses
        where businesses.owner_id = auth.uid()
    )
);
