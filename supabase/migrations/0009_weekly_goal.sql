-- Meredian — weekly training goal
-- Sessions-per-week target that powers the streak system and weekly progress.

alter table profiles
  add column if not exists weekly_goal int not null default 3
    check (weekly_goal >= 1 and weekly_goal <= 14);
