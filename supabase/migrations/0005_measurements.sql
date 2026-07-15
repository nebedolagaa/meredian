-- Meredian — body weight / measurements tracking
-- A lightweight log of the user's body weight over time (stored in kg).

create table if not exists body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  measured_on date not null,
  weight_kg numeric not null check (weight_kg > 0 and weight_kg <= 1000),
  note text,
  created_at timestamptz default now()
);

create index if not exists idx_body_measurements_user
  on body_measurements(user_id, measured_on);

-- Row Level Security: users only see and edit their own measurements.
alter table body_measurements enable row level security;

drop policy if exists "body_measurements_select_own" on body_measurements;
create policy "body_measurements_select_own" on body_measurements
  for select using (auth.uid() = user_id);
drop policy if exists "body_measurements_insert_own" on body_measurements;
create policy "body_measurements_insert_own" on body_measurements
  for insert with check (auth.uid() = user_id);
drop policy if exists "body_measurements_update_own" on body_measurements;
create policy "body_measurements_update_own" on body_measurements
  for update using (auth.uid() = user_id);
drop policy if exists "body_measurements_delete_own" on body_measurements;
create policy "body_measurements_delete_own" on body_measurements
  for delete using (auth.uid() = user_id);
