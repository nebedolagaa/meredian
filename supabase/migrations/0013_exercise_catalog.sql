-- Meridian — exercise catalog metadata
-- Adds category columns used by the exercise library filters:
--   exercise_type  : 'compound' | 'isolation'
--   equipment      : 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight'
--   location       : 'home' | 'gym'
--   gif_url        : optional per-exercise technique GIF (falls back to a
--                    shared placeholder in the UI until real GIFs are added)

alter table exercises
  add column if not exists exercise_type text
    check (exercise_type is null or exercise_type in ('compound', 'isolation')),
  add column if not exists equipment text
    check (equipment is null or equipment in ('barbell', 'dumbbell', 'cable', 'machine', 'bodyweight')),
  add column if not exists location text
    check (location is null or location in ('home', 'gym')),
  add column if not exists gif_url text;

-- Backfill metadata for the global seed exercises (user_id is null).
update exercises e
set
  exercise_type = v.exercise_type,
  equipment     = v.equipment,
  location      = v.location
from (values
  ('Bench Press',            'compound',  'barbell',    'gym'),
  ('Incline Dumbbell Press', 'compound',  'dumbbell',   'gym'),
  ('Overhead Press',         'compound',  'barbell',    'gym'),
  ('Tricep Pushdown',        'isolation', 'cable',      'gym'),
  ('Lateral Raise',          'isolation', 'dumbbell',   'home'),
  ('Squat',                  'compound',  'barbell',    'gym'),
  ('Romanian Deadlift',      'compound',  'barbell',    'gym'),
  ('Leg Press',              'compound',  'machine',    'gym'),
  ('Leg Curl',               'isolation', 'machine',    'gym'),
  ('Calf Raise',             'isolation', 'bodyweight', 'home'),
  ('Deadlift',               'compound',  'barbell',    'gym'),
  ('Barbell Row',            'compound',  'barbell',    'gym'),
  ('Pull-Up',                'compound',  'bodyweight', 'home'),
  ('Seated Cable Row',       'compound',  'cable',      'gym'),
  ('Face Pull',              'isolation', 'cable',      'gym'),
  ('Bicep Curl',             'isolation', 'dumbbell',   'home'),
  ('Hammer Curl',            'isolation', 'dumbbell',   'home'),
  ('Plank',                  'isolation', 'bodyweight', 'home'),
  ('Ab Wheel Rollout',       'compound',  'bodyweight', 'home')
) as v(name, exercise_type, equipment, location)
where e.user_id is null
  and e.name = v.name;
