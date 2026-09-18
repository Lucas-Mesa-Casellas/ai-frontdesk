-- Per-business country, used as the default region when normalizing a
-- caller-stated phone number to E.164 (backend/app/services/phone.py) -- a
-- national-format number like "0782606483" is ambiguous without knowing
-- which country's dialing plan it belongs to, and hardcoding France would
-- break the first Spanish business that comes on. Backfilled from each
-- existing business's language for now (fr -> FR, otherwise ES); language
-- and country aren't the same thing long-term, but it's the only signal
-- available for businesses onboarded before this column existed.
alter table businesses add column if not exists country text not null default 'ES';

update businesses set country = case language when 'fr' then 'FR' else 'ES' end;
