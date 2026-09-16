-- AI Front Desk - table-level DELETE privilege for calls and bookings
-- 007_delete_policies.sql added RLS policies that restrict WHICH rows an
-- owner can delete, but Postgres has a coarser layer underneath RLS: the
-- authenticated role also needs the plain table-level DELETE privilege to
-- attempt a delete at all. calls/bookings never had DELETE granted (only
-- SELECT/UPDATE were ever needed before this feature), so Postgres was
-- rejecting the statement before RLS got a chance to evaluate it -- this
-- is what Supabase's dashboard was flagging as "custom Data API
-- permissions... access may be restricted for some operations" on these
-- two tables.
grant delete on calls to authenticated;
grant delete on bookings to authenticated;
