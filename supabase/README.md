# Supabase migrations

Apply with the [Supabase CLI](https://supabase.com/docs/guides/cli) from the repo root:

```bash
npx supabase db push
```

Or paste **`migrations/20260407000000_init_viyac.sql`** into the dashboard **SQL Editor** after a reset.

## Full schema (`20260407000000_init_viyac.sql`)

Single migration defining:

- **`public.profiles`** — Clerk webhook (`id`, `email`, `display_name`, `auth_provider`, `auth_providers`, `role`)
- **`api.tracks`**, **`api.albums`**, **`api.album_tracks`** — catalog (incl. `stream_url`, `master_download_url`, `master_download_count`, `provenance_type`, …)
- **`api.user_track_listen_progress`**, **`api.track_ratings`** — listen + personal ratings
- **`api.track_master_purchases`** — master download entitlement (writes via service role)
- **`api.increment_track_master_download(uuid)`** — RPC for master download counter
- Grants and RLS on all `api` tables

**Reset (optional):** uncomment the `DROP SCHEMA` / `DROP TABLE` lines at the top of the migration, or run them manually, then apply the file.

**Expose `api` for PostgREST:** Project Settings → API → **Exposed schemas** — include **`api`** if the browser client should use the REST API for these tables.

**Clerk + RLS:** Policies use `auth.jwt()->>'sub'`. Until Clerk JWT is wired into Supabase, use **Next.js routes + service role** (see `createServiceCatalog()`).

**Masters:** Insert into `api.track_master_purchases` after payment. `GET /api/catalog/tracks/[trackId]/master-download` returns a signed URL. Optional env **`SUPABASE_MASTER_BUCKET`** (defaults to bucket `vault`).
