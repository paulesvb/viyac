-- Optional marker on profiles rows (e.g. seed / tooling). Webhook upserts use is_dev = false.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_dev boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_dev IS
  'Optional: true for dev/seed tooling; false when upserted via Clerk production webhook.';
