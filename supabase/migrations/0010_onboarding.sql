-- Meridian — onboarding profile fields
-- Sex, height, goal (type + target weight) and an onboarding-completed flag.
-- Starting body weight is stored as the first row in body_measurements.

alter table profiles
  add column if not exists sex text
    check (sex in ('male', 'female')),
  add column if not exists height_cm numeric
    check (height_cm > 0 and height_cm <= 300),
  add column if not exists goal_type text
    check (goal_type in ('lose_weight', 'gain_muscle', 'burn_fat')),
  add column if not exists goal_weight_kg numeric
    check (goal_weight_kg > 0 and goal_weight_kg <= 1000),
  add column if not exists onboarding_completed boolean not null default false;

-- Existing users should not be forced through the wizard.
update profiles set onboarding_completed = true;
