-- Optional per-exercise rest time override, in seconds. When null, the
-- session runner falls back to the user's profile-level rest_seconds.

alter table plan_exercises
  add column if not exists rest_seconds int
    check (rest_seconds is null or (rest_seconds >= 0 and rest_seconds <= 600));
