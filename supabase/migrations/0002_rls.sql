-- Meredian — Row Level Security policies
-- Users can only read/write their own rows.
-- Global exercises (user_id is null) are readable by everyone.

alter table profiles enable row level security;
alter table exercises enable row level security;
alter table workout_plans enable row level security;
alter table plan_exercises enable row level security;
alter table workout_sessions enable row level security;
alter table session_logs enable row level security;

-- ── profiles ────────────────────────────────────────────────
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- ── exercises ───────────────────────────────────────────────
-- Read your own + global (null) exercises
create policy "exercises_select" on exercises
  for select using (user_id is null or auth.uid() = user_id);
create policy "exercises_insert_own" on exercises
  for insert with check (auth.uid() = user_id);
create policy "exercises_update_own" on exercises
  for update using (auth.uid() = user_id);
create policy "exercises_delete_own" on exercises
  for delete using (auth.uid() = user_id);

-- ── workout_plans ───────────────────────────────────────────
create policy "plans_select_own" on workout_plans
  for select using (auth.uid() = user_id);
create policy "plans_insert_own" on workout_plans
  for insert with check (auth.uid() = user_id);
create policy "plans_update_own" on workout_plans
  for update using (auth.uid() = user_id);
create policy "plans_delete_own" on workout_plans
  for delete using (auth.uid() = user_id);

-- ── plan_exercises (ownership inferred via parent plan) ──────
create policy "plan_exercises_select" on plan_exercises
  for select using (
    exists (
      select 1 from workout_plans p
      where p.id = plan_exercises.plan_id and p.user_id = auth.uid()
    )
  );
create policy "plan_exercises_insert" on plan_exercises
  for insert with check (
    exists (
      select 1 from workout_plans p
      where p.id = plan_exercises.plan_id and p.user_id = auth.uid()
    )
  );
create policy "plan_exercises_update" on plan_exercises
  for update using (
    exists (
      select 1 from workout_plans p
      where p.id = plan_exercises.plan_id and p.user_id = auth.uid()
    )
  );
create policy "plan_exercises_delete" on plan_exercises
  for delete using (
    exists (
      select 1 from workout_plans p
      where p.id = plan_exercises.plan_id and p.user_id = auth.uid()
    )
  );

-- ── workout_sessions ────────────────────────────────────────
create policy "sessions_select_own" on workout_sessions
  for select using (auth.uid() = user_id);
create policy "sessions_insert_own" on workout_sessions
  for insert with check (auth.uid() = user_id);
create policy "sessions_update_own" on workout_sessions
  for update using (auth.uid() = user_id);
create policy "sessions_delete_own" on workout_sessions
  for delete using (auth.uid() = user_id);

-- ── session_logs (ownership inferred via parent session) ────
create policy "session_logs_select" on session_logs
  for select using (
    exists (
      select 1 from workout_sessions s
      where s.id = session_logs.session_id and s.user_id = auth.uid()
    )
  );
create policy "session_logs_insert" on session_logs
  for insert with check (
    exists (
      select 1 from workout_sessions s
      where s.id = session_logs.session_id and s.user_id = auth.uid()
    )
  );
create policy "session_logs_update" on session_logs
  for update using (
    exists (
      select 1 from workout_sessions s
      where s.id = session_logs.session_id and s.user_id = auth.uid()
    )
  );
create policy "session_logs_delete" on session_logs
  for delete using (
    exists (
      select 1 from workout_sessions s
      where s.id = session_logs.session_id and s.user_id = auth.uid()
    )
  );
