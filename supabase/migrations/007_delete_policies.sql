-- AI Front Desk - delete policies for calls and bookings
-- Lets a business owner permanently remove a call or booking from their
-- own dashboard (test calls, junk data from a since-fixed bug, or anything
-- a client wants gone). calls/bookings previously had SELECT/UPDATE
-- policies only (004_rls_policy_sync.sql, 006_call_translations.sql) --
-- without a DELETE policy, a delete from the owner's own session is
-- silently blocked by RLS (0 rows affected, no Postgres error), the same
-- silent-failure shape already hit and fixed for confirmBooking/
-- cancelBooking and the translation cache writes.
drop policy if exists "owner can delete own calls" on calls;
create policy "owner can delete own calls"
on calls for delete
using (
    business_id in (
        select businesses.id from businesses
        where businesses.owner_id = auth.uid()
    )
);

drop policy if exists "owner can delete own bookings" on bookings;
create policy "owner can delete own bookings"
on bookings for delete
using (
    business_id in (
        select businesses.id from businesses
        where businesses.owner_id = auth.uid()
    )
);
