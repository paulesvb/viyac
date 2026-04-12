-- Marks profiles created/updated from local Clerk (next dev) vs production webhook users.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_dev boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_dev IS
  'True when the row was last upserted from local development (Clerk Development + /sync); false for production webhook users.';
