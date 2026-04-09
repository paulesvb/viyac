import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { VAULT_BUCKET } from '@/lib/storage';

const TWO_HOURS_IN_SECONDS = 60 * 60 * 2;

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

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.storage
    .from(VAULT_BUCKET)
    .createSignedUrl(trackPath, TWO_HOURS_IN_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? 'Failed to create signed URL.');
  }

  return data.signedUrl;
}
