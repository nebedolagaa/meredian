-- Plan archiving: keep templates without deleting history.
alter table public.workout_plans
  add column if not exists is_archived boolean not null default false;

create index if not exists idx_plans_archived on workout_plans(user_id, is_archived);
