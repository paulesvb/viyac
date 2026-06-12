-- Per-user dismissal state for the Home intro card.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS home_intro_dismissed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.home_intro_dismissed IS
  'When true, hides the signed-in Home intro card for this user.';
