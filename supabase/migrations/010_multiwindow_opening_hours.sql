-- AI Front Desk - convert opening_hours.days from a single {open, close}
-- window per day into a LIST of windows, so a day can have a midday
-- closure instead of one continuous span (Barazzetti Fils actually needs
-- this: Mon-Thu 08:00-12:00 + 13:30-17:30, Fri 08:00-12:00 + 13:30-16:30 --
-- see backend/app/services/scheduling.py). Wraps each existing
-- single-window day into a one-element list, and turns the old "closed"
-- convention (a JSON null) into an empty list, the new list-shaped
-- equivalent of the same thing. Idempotent: a day already holding a list
-- (i.e. already migrated) is left untouched, so running this twice is safe.

create or replace function _to_multiwindow(day jsonb) returns jsonb as $$
  select case
    when day is null or jsonb_typeof(day) = 'null' then '[]'::jsonb
    when jsonb_typeof(day) = 'array' then day
    else jsonb_build_array(day)
  end;
$$ language sql immutable;

update businesses
set opening_hours = jsonb_set(
  opening_hours,
  '{days}',
  jsonb_build_object(
    'mon', _to_multiwindow(opening_hours -> 'days' -> 'mon'),
    'tue', _to_multiwindow(opening_hours -> 'days' -> 'tue'),
    'wed', _to_multiwindow(opening_hours -> 'days' -> 'wed'),
    'thu', _to_multiwindow(opening_hours -> 'days' -> 'thu'),
    'fri', _to_multiwindow(opening_hours -> 'days' -> 'fri'),
    'sat', _to_multiwindow(opening_hours -> 'days' -> 'sat'),
    'sun', _to_multiwindow(opening_hours -> 'days' -> 'sun')
  )
)
where opening_hours is not null and opening_hours -> 'days' is not null;

drop function _to_multiwindow(jsonb);
