-- Meridian — seed global exercises (user_id = null)
-- Idempotent: only inserts a global exercise if no global row with that name exists.

insert into exercises (name, muscle_group)
select v.name, v.muscle_group
from (values
  ('Bench Press',            'chest'),
  ('Incline Dumbbell Press', 'chest'),
  ('Overhead Press',         'shoulders'),
  ('Tricep Pushdown',        'arms'),
  ('Lateral Raise',          'shoulders'),
  ('Squat',                  'legs'),
  ('Romanian Deadlift',      'legs'),
  ('Leg Press',              'legs'),
  ('Leg Curl',               'legs'),
  ('Calf Raise',             'legs'),
  ('Deadlift',               'back'),
  ('Barbell Row',            'back'),
  ('Pull-Up',                'back'),
  ('Seated Cable Row',       'back'),
  ('Face Pull',              'shoulders'),
  ('Bicep Curl',             'arms'),
  ('Hammer Curl',            'arms'),
  ('Plank',                  'core'),
  ('Ab Wheel Rollout',       'core')
) as v(name, muscle_group)
where not exists (
  select 1 from exercises e
  where e.user_id is null and e.name = v.name
);
