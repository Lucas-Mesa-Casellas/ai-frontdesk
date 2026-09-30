-- Per-call analytics, recorded for the record: these columns were applied to
-- the live database directly, so this file is NOT meant to be run again
-- (every statement is idempotent anyway).
--
--   duration_seconds     length of the call, from Retell's start/end timestamps
--   user_sentiment       Retell's call_analysis.user_sentiment, when present
--   disconnection_reason Retell's disconnection_reason, when present
--   topic                short category of what the caller asked about (AI extraction)
--   outcome_reason       one short phrase: why the call did or didn't end in a
--                        booking or transfer (AI extraction, in the business's language)
alter table calls add column if not exists duration_seconds integer;
alter table calls add column if not exists user_sentiment text;
alter table calls add column if not exists disconnection_reason text;
alter table calls add column if not exists topic text;
alter table calls add column if not exists outcome_reason text;
