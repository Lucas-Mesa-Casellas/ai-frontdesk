-- Security hardening, recorded for the repo only: already applied to the live database.
-- Do not run again on that database (it is harmless if you do, these statements are idempotent).
-- Neither function is meant to be called through the API: only the database itself
-- (the RLS event trigger / the retention job) runs them.

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.anonymize_old_call_data() from public, anon, authenticated;
alter function public.anonymize_old_call_data() set search_path = public, pg_temp;
