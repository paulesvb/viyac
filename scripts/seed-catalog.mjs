/**
 * Idempotent catalog seed (api schema) + profiles row for SEED_CLERK_USER_ID.
 *
 * Run: npm run seed:catalog
 * Requires .env.local (via --env-file) with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_CLERK_USER_ID.
 *
 * Clerk user id: Dashboard → Users → user → copy "User ID" (starts with user_).
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ownerId = process.env.SEED_CLERK_USER_ID?.trim();

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
if (!ownerId) {
  console.error('Set SEED_CLERK_USER_ID in .env.local to your Clerk user id (e.g. user_2abc...).');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const api = supabase.schema('api');

/** Fixed UUIDs so re-runs upsert the same rows. */
const TRACK_A = 'a0000000-0000-4000-8000-000000000001';
const TRACK_B = 'a0000000-0000-4000-8000-000000000002';
const ALBUM_ID = 'b0000000-0000-4000-8000-000000000001';

const trackPath =
  process.env.SEED_VAULT_TRACK_PATH?.trim() || 'seed/demo/index.m3u8';

async function main() {
  const { error: pErr } = await supabase.from('profiles').upsert(
    {
      id: ownerId,
      email: 'seed-local@viyac.invalid',
      display_name: 'Seed listener',
      auth_provider: 'email',
      auth_providers: ['email'],
      role: 'user',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
  if (pErr) {
    console.error('[profiles]', pErr.message);
    process.exit(1);
  }

  const trackRow = {
    owner_id: ownerId,
    visibility: 'public',
    content_type: 'audio',
    track_path: trackPath,
    duration_ms: 180_000,
    provenance_type: 'genesis',
    sort_order: 0,
    description_en: 'Replace `track_path` / vault files or use SEED_VAULT_TRACK_PATH in .env.local.',
  };

  const { error: tErr } = await api.from('tracks').upsert(
    [
      {
        id: TRACK_A,
        slug: 'seed-demo-a',
        title: 'Seed Demo A',
        ...trackRow,
        sort_order: 0,
      },
      {
        id: TRACK_B,
        slug: 'seed-demo-b',
        title: 'Seed Demo B',
        ...trackRow,
        sort_order: 1,
      },
    ],
    { onConflict: 'id' },
  );
  if (tErr) {
    console.error('[tracks]', tErr.message);
    process.exit(1);
  }

  const { error: aErr } = await api.from('albums').upsert(
    {
      id: ALBUM_ID,
      slug: 'seed-vault-demo',
      title: 'Seed Vault Demo',
      owner_id: ownerId,
      visibility: 'public',
      featured_track_id: TRACK_A,
      sort_order: 0,
    },
    { onConflict: 'id' },
  );
  if (aErr) {
    console.error('[albums]', aErr.message);
    process.exit(1);
  }

  const { error: atErr } = await api.from('album_tracks').upsert(
    [
      { album_id: ALBUM_ID, track_id: TRACK_A, sort_order: 0 },
      { album_id: ALBUM_ID, track_id: TRACK_B, sort_order: 1 },
    ],
    { onConflict: 'album_id,track_id' },
  );
  if (atErr) {
    console.error('[album_tracks]', atErr.message);
    process.exit(1);
  }

  console.log('Seed OK: profiles + 2 tracks + 1 album (featured = Seed Demo A).');
  console.log(`  track_path: ${trackPath}`);
  console.log('  catalog_track_id for dashboard-tracks.ts (optional):');
  console.log(`    Seed Demo A: ${TRACK_A}`);
  console.log(`    Seed Demo B: ${TRACK_B}`);
  console.log(`  album id: ${ALBUM_ID}`);
  console.log('  Ensure this HLS object exists in the vault bucket before playback.');
}

main();
