-- Per-set RPE (rate of perceived exertion, 1-10) and an optional short note.
alter table public.session_logs
  add column if not exists rpe smallint,
  add column if not exists note text;

alter table public.session_logs
  drop constraint if exists session_logs_rpe_check;

alter table public.session_logs
  add constraint session_logs_rpe_check
  check (rpe is null or (rpe >= 1 and rpe <= 10));
