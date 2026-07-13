-- Meredian — training level for personalised exercise recommendations
-- Adds profiles.training_level, asked during onboarding after height/weight/
-- sex. Used together with body weight, height and sex to suggest working
-- weights and difficulty for each exercise.

alter table profiles
  add column if not exists training_level text
    check (training_level is null or training_level in (
      'beginner', 'intermediate', 'advanced', 'professional'
    ));
