-- Retell's own id for the call. The webhook stores it when the call ends, so the
-- later call_analyzed event (which carries user_sentiment) can find the row.
-- Apply this BEFORE deploying the backend change that writes the column.
alter table calls add column if not exists retell_call_id text;
create index if not exists calls_retell_call_id_idx on calls (retell_call_id);
