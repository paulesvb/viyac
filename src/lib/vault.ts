import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { VAULT_BUCKET } from '@/lib/storage';

const TWO_HOURS_IN_SECONDS = 60 * 60 * 2;

/**
 * Storage object key inside the `vault` bucket (no leading slash, no `vault/` prefix).
 */
export function normalizeVaultObjectKey(trackPath: string): string {
  let p = trackPath.trim().replace(/^\/+/, '');
  const lower = p.toLowerCase();
  if (lower.startsWith(`${VAULT_BUCKET}/`)) {
    p = p.slice(VAULT_BUCKET.length + 1);
  }
  return p;
}

/**
 * Service-role signed URL. Callers must authorize the path first
 * (`/api/vault/stream`, `/api/vault/signed-url`, or an authenticated server action).
 */
export async function getVaultSignedUrl(trackPath: string): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase server environment variables.');
  }

  const key = normalizeVaultObjectKey(trackPath);
  if (!key) {
    throw new Error('Empty vault object path.');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.storage
    .from(VAULT_BUCKET)
    .createSignedUrl(key, TWO_HOURS_IN_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? 'Failed to create signed URL.');
  }

  return data.signedUrl;
}
