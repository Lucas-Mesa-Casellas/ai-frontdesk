-- One stored call per Retell call id, so a retried or replayed call_ended webhook
-- can never create a second row (backend/app/services/call_ingest.py).
--
-- The column and a plain index already exist on the live database (migration 012);
-- "if not exists" keeps this safe either way. A UNIQUE index treats NULLs as
-- distinct, so older calls without an id are unaffected.
--
-- Before applying, this must return no rows (duplicates would block the index):
--   select retell_call_id, count(*) from calls
--   where retell_call_id is not null group by 1 having count(*) > 1;
-- Apply it BEFORE merging/deploying the backend change that relies on it.
alter table calls add column if not exists retell_call_id text;
create unique index if not exists calls_retell_call_id_key on calls (retell_call_id);
