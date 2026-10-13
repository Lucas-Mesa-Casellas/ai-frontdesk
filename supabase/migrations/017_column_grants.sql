-- Column-level UPDATE for the dashboard role on calls and bookings.
--
-- NOT APPLIED. Review it, then apply it yourself in the Supabase SQL editor, and right after
-- check in the dashboard that Confirm and Cancel on a booking, and "Translate transcript" on a
-- call, still work (see security-review.local.md for the full checklist).
--
-- Why: `authenticated` has table-level UPDATE on calls and bookings, so a signed-in owner can,
-- through the public anon key and their own session, rewrite ANY column of their own rows
-- (transcript, summary, caller_phone, status, extracted fields...). RLS limits WHICH rows, not
-- WHICH columns. The dashboard only ever writes two columns:
--   calls.translations  frontend/lib/translate-actions.ts (translateCallFields, translateTranscript)
--   bookings.status     frontend/lib/dash-actions.ts (confirmBooking, cancelBooking)
-- so UPDATE is narrowed to exactly those. The backend writes with service_role, which is not
-- affected. RLS policies, SELECT and DELETE are unchanged. Nothing else is touched.
--
-- Idempotent: running it twice leaves the same privileges.
-- Order matters: revoking the table-level privilege also drops any column-level UPDATE
-- privileges on that table, so the grants come after the revokes.

revoke update on table public.calls from authenticated;
revoke update on table public.bookings from authenticated;

grant update (translations) on table public.calls to authenticated;
grant update (status) on table public.bookings to authenticated;

-- Check after applying (should list exactly calls.translations and bookings.status):
--   select table_name, column_name from information_schema.column_privileges
--   where grantee = 'authenticated' and privilege_type = 'UPDATE'
--     and table_schema = 'public' and table_name in ('calls', 'bookings')
--   order by 1, 2;
-- and table-level UPDATE should now be false:
--   select has_table_privilege('authenticated', 'public.calls', 'UPDATE'),
--          has_table_privilege('authenticated', 'public.bookings', 'UPDATE');

-- ROLLBACK (restores the previous table-level UPDATE; run only if Confirm/Cancel/Translate break):
--   grant update on table public.calls to authenticated;
--   grant update on table public.bookings to authenticated;
