-- Meridian — user preferences (units + default rest timer)
-- Adds columns used by the units system and the in-session rest timer.

alter table profiles
  add column if not exists unit_preference text not null default 'kg'
    check (unit_preference in ('kg', 'lb'));

alter table profiles
  add column if not exists rest_seconds int not null default 90
    check (rest_seconds >= 0 and rest_seconds <= 900);
