# Supabase migrations

## Dev and prod (two Supabase projects)

Use **one Supabase project for local/dev** and **another for production**. Pair each with the matching **Clerk** environment (Development vs Production) so `public.profiles.id`, `api.tracks.owner_id`, and grants always reference users that exist in that Clerk app.

- **Local:** `.env.local` → dev Supabase URL + anon/service role from the dev project; `npx supabase link --project-ref <dev-ref>` then `npx supabase db push` against dev.
- **Production:** Set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel (prod project). Run migrations against prod when you release (CLI linked to prod ref, CI, or SQL Editor).

If you use **Vercel Preview** deployments, point them at the **dev** Supabase + Clerk test keys unless you intentionally want previews on production data.

Avoid using a single shared database for both Clerk instances; you will get orphaned or mismatched `owner_id` values.

---

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

**Expose `api` for PostgREST:** Project Settings → API → **Exposed schemas** — include **`api`**. Without it, PostgREST returns `Invalid schema: api` for **any** REST request to `api.*`, including the app’s **service-role** catalog writes (`createServiceCatalog()`).

**Clerk + RLS:** Policies use `auth.jwt()->>'sub'`. Until Clerk JWT is wired into Supabase, use **Next.js routes + service role** (see `createServiceCatalog()`).

**Masters:** Insert into `api.track_master_purchases` after payment. `GET /api/catalog/tracks/[trackId]/master-download` returns a signed URL. Optional env **`SUPABASE_MASTER_BUCKET`** (defaults to bucket `vault`).

## Seed data

After migrations, set **`SEED_CLERK_USER_ID`** in `.env.local` (Clerk Dashboard → Users → copy User ID, e.g. `user_...`). Optionally **`SEED_VAULT_TRACK_PATH`** for a real vault HLS key.

```bash
npm run seed:catalog
```

This upserts **`public.profiles`** for that user (placeholder email), two **`api.tracks`** (`seed-demo-a` / `seed-demo-b`), one public **`api.albums`** (`seed-vault-demo`), and **`api.album_tracks`**. Re-running is safe (fixed UUIDs).

Playback still needs **`track_path`** to exist in the **vault** bucket (or change env + re-seed). To use catalog listen/ratings in the player, add the seeded track UUID to **`catalog_track_id`** in `dashboard-tracks.ts` (IDs are logged in script output — or query `api.tracks`).

`supabase/seed.sql` is a stub; local **`supabase db reset`** runs it after migrations — use **`npm run seed:catalog`** for real data.
