-- Fix account deletion: ensure all user-owned data can be removed when the
-- auth.users row is deleted by supabase auth admin deleteUser().
--
-- Without a delete rule, an unowned FK reference makes deleting auth.users fail
-- with: "Database error deleting user" (unexpected_failure).
--
-- Account deletion itself is driven by the existing owner cascades
-- (profiles -> exercises/workout_plans/workout_sessions on delete cascade,
-- session_logs.session_id -> workout_sessions on delete cascade). The rules
-- below only need to keep *those* cascades unblocked. For the two "history"
-- links we use ON DELETE SET NULL instead of CASCADE so that a normal
-- delete of a single exercise or plan does NOT silently wipe past workout
-- history — the logged sets/sessions survive, just detached from the removed
-- template row.

-- plan_exercises -> exercises
-- A plan row that references a deleted exercise is meaningless, so cascade.
alter table if exists public.plan_exercises
  drop constraint if exists plan_exercises_exercise_id_fkey;

alter table if exists public.plan_exercises
  add constraint plan_exercises_exercise_id_fkey
  foreign key (exercise_id)
  references public.exercises(id)
  on delete cascade;

-- workout_sessions -> workout_plans
-- Keep completed/skipped sessions as history when a plan is deleted.
alter table if exists public.workout_sessions
  drop constraint if exists workout_sessions_plan_id_fkey;

alter table if exists public.workout_sessions
  add constraint workout_sessions_plan_id_fkey
  foreign key (plan_id)
  references public.workout_plans(id)
  on delete set null;

-- session_logs -> plan_exercises
-- Keep the logged sets as history when the plan exercise is removed.
alter table if exists public.session_logs
  drop constraint if exists session_logs_plan_exercise_id_fkey;

alter table if exists public.session_logs
  add constraint session_logs_plan_exercise_id_fkey
  foreign key (plan_exercise_id)
  references public.plan_exercises(id)
  on delete set null;
