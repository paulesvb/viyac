-- Turn on RLS for public.profiles (matches production when RLS is enabled but no policies exist).
-- With RLS enabled and zero policies: anon/authenticated get no rows via PostgREST for this table;
-- service_role still bypasses RLS for Clerk webhooks / Next server (service key).
--
-- If you later need browser Supabase client access to profiles, add policies (e.g. own row via
-- auth.jwt()->>'sub') in a separate migration.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
