-- Each business's own timezone (IANA name), used to decide whether it is open
-- right now (backend/app/services/open_status.py). Until now the backend
-- assumed Europe/Madrid for everyone. Backfilled from country where known;
-- set the rest by hand. Until a row has one, the backend falls back to the
-- usual timezone of its country.
alter table businesses add column if not exists timezone text;

update businesses
set timezone = case country
  when 'FR' then 'Europe/Paris'
  when 'ES' then 'Europe/Madrid'
  when 'GB' then 'Europe/London'
end
where timezone is null and country in ('FR', 'ES', 'GB');
