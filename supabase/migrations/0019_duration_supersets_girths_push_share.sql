-- 0019: session duration, supersets, body girths, web-push subscriptions,
--       plan share links.
-- Run manually in the Supabase SQL editor.

-- Workout duration: set when the session actually starts.
alter table public.workout_sessions
  add column if not exists started_at timestamptz;

-- Supersets: exercises sharing the same non-null group number alternate
-- together. Group numbers are local to a plan.
alter table public.plan_exercises
  add column if not exists superset_group integer;

-- Body girths (cm) alongside weight — weight alone lies for recomp goals.
alter table public.body_measurements
  add column if not exists waist_cm numeric,
  add column if not exists chest_cm numeric,
  add column if not exists arm_cm numeric;

-- Web-push subscriptions (one row per browser/device).
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_owner" on public.push_subscriptions;
create policy "push_subscriptions_owner"
  on public.push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Plan sharing: a plan with a token is readable through the share page
-- (served via the server-side admin client — RLS stays owner-only).
alter table public.workout_plans
  add column if not exists share_token uuid;

create unique index if not exists workout_plans_share_token_key
  on public.workout_plans (share_token)
  where share_token is not null;
