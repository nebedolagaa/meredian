-- Meridian — body-map muscle targeting
-- Adds exercises.primary_muscle with fine-grained values used by the
-- interactive body illustration in the plan builder, backfills the seed
-- catalog and adds a few new global exercises so every muscle region has
-- at least one match.

alter table exercises
  add column if not exists primary_muscle text
    check (primary_muscle is null or primary_muscle in (
      'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
      'abs', 'glutes', 'quads', 'hamstrings', 'calves'
    ));

-- Backfill the global seed exercises (user_id is null).
update exercises e
set primary_muscle = v.primary_muscle
from (values
  ('Bench Press',            'chest'),
  ('Incline Dumbbell Press', 'chest'),
  ('Overhead Press',         'shoulders'),
  ('Tricep Pushdown',        'triceps'),
  ('Lateral Raise',          'shoulders'),
  ('Squat',                  'quads'),
  ('Romanian Deadlift',      'hamstrings'),
  ('Leg Press',              'quads'),
  ('Leg Curl',               'hamstrings'),
  ('Calf Raise',             'calves'),
  ('Deadlift',               'back'),
  ('Barbell Row',            'back'),
  ('Pull-Up',                'back'),
  ('Seated Cable Row',       'back'),
  ('Face Pull',              'shoulders'),
  ('Bicep Curl',             'biceps'),
  ('Hammer Curl',            'biceps'),
  ('Plank',                  'abs'),
  ('Ab Wheel Rollout',       'abs')
) as v(name, primary_muscle)
where e.user_id is null
  and e.name = v.name;

-- New global exercises covering muscles with no seed coverage.
insert into exercises (name, muscle_group, exercise_type, equipment, location, primary_muscle)
select v.name, v.muscle_group, v.exercise_type, v.equipment, v.location, v.primary_muscle
from (values
  ('Hip Thrust',        'legs', 'compound',  'barbell',    'gym',  'glutes'),
  ('Glute Bridge',      'legs', 'compound',  'bodyweight', 'home', 'glutes'),
  ('Bulgarian Split Squat', 'legs', 'compound', 'dumbbell', 'home', 'quads'),
  ('Wrist Curl',        'arms', 'isolation', 'dumbbell',   'home', 'forearms'),
  ('Reverse Wrist Curl','arms', 'isolation', 'dumbbell',   'home', 'forearms'),
  ('Dips',              'chest','compound',  'bodyweight', 'home', 'triceps'),
  ('Push-Up',           'chest','compound',  'bodyweight', 'home', 'chest'),
  ('Crunch',            'core', 'isolation', 'bodyweight', 'home', 'abs'),
  ('Seated Calf Raise', 'legs', 'isolation', 'machine',    'gym',  'calves')
) as v(name, muscle_group, exercise_type, equipment, location, primary_muscle)
where not exists (
  select 1 from exercises e
  where e.user_id is null and e.name = v.name
);
