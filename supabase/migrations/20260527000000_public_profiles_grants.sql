-- Explicit Data API grants for public.profiles (Supabase: new projects after 2026-05-30
-- require GRANT before PostgREST / supabase-js can access public tables).
-- RLS remains enabled with no policies; anon/authenticated see no rows until policies exist.
-- service_role bypasses RLS (Clerk webhook, Next server routes).

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL ON TABLE public.profiles TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO anon, authenticated;
