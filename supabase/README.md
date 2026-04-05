# Supabase migrations

Apply SQL in the Supabase dashboard (**SQL Editor**) or with the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase db push
```

## Music catalog (`20260402140000_music_catalog.sql`)

Creates `tracks`, `albums`, `album_tracks`, adds `profiles.role`, and enables RLS.

**Clerk + RLS:** Policies use `auth.jwt()->>'sub'`. Configure Supabase to validate Clerk JWTs (Third-party auth / custom JWT) so `sub` matches `profiles.id`. Until then, use **server routes with the service role** (RLS bypassed) — see `GET /api/catalog/albums`.
