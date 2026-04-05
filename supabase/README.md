# Supabase migrations

Apply SQL in the Supabase dashboard (**SQL Editor**) or with the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase db push
```

## Music catalog (`20260402140000_music_catalog.sql`)

Creates schema **`api`** with `tracks`, `albums`, `album_tracks`, grants, and RLS. Adds `profiles.role` on **`public.profiles`** (unchanged).

**Expose `api` for PostgREST:** Project Settings → API → **Exposed schemas** — include `api` (alongside `public`) if the browser Supabase client should query these tables.

**Clerk + RLS:** Policies use `auth.jwt()->>'sub'`. Configure Supabase to validate Clerk JWTs (Third-party auth / custom JWT) so `sub` matches `profiles.id`. Until then, use **server routes with the service role** (RLS bypassed) — see `GET /api/catalog/albums`, which uses `.schema('api')`.
