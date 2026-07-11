-- Meridian — initial schema
-- Run in the Supabase SQL editor or via the Supabase CLI.

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────

-- Extends auth.users
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now()
);

-- Exercise catalogue (user-owned, or global where user_id is null)
create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  description text,           -- free text; future: AI embedding column added here
  muscle_group text,          -- optional, nullable in MVP
  created_at timestamptz default now()
);

-- Workout plan (template)
create table if not exists workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

-- Exercises inside a plan with target values
create table if not exists plan_exercises (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references workout_plans(id) on delete cascade,
  exercise_id uuid references exercises(id),
  order_index int not null default 0,
  target_sets int not null,
  target_reps int not null,
  target_weight numeric not null
);

-- Concrete execution of a plan on a specific date
create table if not exists workout_sessions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references workout_plans(id),
  user_id uuid references profiles(id) on delete cascade not null,
  status text not null default 'planned'
    check (status in ('planned','in_progress','completed','skipped')),
  scheduled_date date not null,
  completed_at timestamptz,
  notes text
);

-- Actual per-set log
create table if not exists session_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references workout_sessions(id) on delete cascade,
  plan_exercise_id uuid references plan_exercises(id),
  set_number int not null,
  actual_reps int,
  actual_weight numeric,
  completed boolean default false
);

-- ─────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────
create index if not exists idx_exercises_user on exercises(user_id);
create index if not exists idx_plan_exercises_plan on plan_exercises(plan_id);
create index if not exists idx_sessions_user on workout_sessions(user_id);
create index if not exists idx_sessions_date on workout_sessions(scheduled_date);
create index if not exists idx_session_logs_session on session_logs(session_id);

-- ─────────────────────────────────────────────────────────────
-- Auto-create a profile row when a new auth user signs up
-- ─────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
