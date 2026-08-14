-- Per-business language for outbound communications (currently notify_owner
-- emails; will extend to dashboard UI language later as Layer 2 grows).
alter table businesses add column if not exists language text not null default 'es'
  check (language in ('es', 'fr', 'en'));
