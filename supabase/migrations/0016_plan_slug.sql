-- Human-readable slug for workout plans, used in URLs (/plans/[slug]).
-- Unique per user; the app appends a numeric suffix on collision.

alter table workout_plans
  add column if not exists slug text;

-- Backfill existing rows: slugify the name, disambiguating duplicates per
-- user with a "-2", "-3", … suffix based on creation order.
with numbered as (
  select
    id,
    user_id,
    nullif(
      regexp_replace(
        regexp_replace(lower(coalesce(name, '')), '[^a-z0-9]+', '-', 'g'),
        '(^-|-$)', '', 'g'
      ),
      ''
    ) as base,
    row_number() over (
      partition by
        user_id,
        regexp_replace(
          regexp_replace(lower(coalesce(name, '')), '[^a-z0-9]+', '-', 'g'),
          '(^-|-$)', '', 'g'
        )
      order by created_at, id
    ) as rn
  from workout_plans
  where slug is null
)
update workout_plans p
set slug = case
  when numbered.rn = 1 then coalesce(numbered.base, 'plan')
  else coalesce(numbered.base, 'plan') || '-' || numbered.rn
end
from numbered
where p.id = numbered.id;

create unique index if not exists idx_workout_plans_user_slug
  on workout_plans (user_id, slug);
