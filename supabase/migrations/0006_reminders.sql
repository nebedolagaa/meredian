-- Meridian — opt-in session reminders
-- When enabled, the app shows a browser notification for a session scheduled
-- today that hasn't been completed yet (delivered while the app is open).

alter table profiles
  add column if not exists reminders_enabled boolean not null default false;
