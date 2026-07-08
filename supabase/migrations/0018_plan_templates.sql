-- Lets a user mark one of their own plans as a reusable template, surfaced
-- alongside the built-in templates in the template picker.

alter table workout_plans
  add column if not exists is_template boolean not null default false;
