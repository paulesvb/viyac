import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { VAULT_BUCKET } from '@/lib/storage';

const SIGNED_URL_TTL_SECONDS = 60 * 60; /* 1 hour — large WAV download */

function masterBucket(): string {
  const b = process.env.SUPABASE_MASTER_BUCKET?.trim();
  return b && b.length > 0 ? b : VAULT_BUCKET;
}

function isUnsafeStorageKey(p: string): boolean {
  return p.includes('..') || p.startsWith('/') || p.includes('\\');
}

/**
 * Time-limited signed URL for a master WAV object. Caller must enforce purchase (or ownership).
 */
export async function signMasterDownloadObject(
  objectKey: string,
): Promise<{ signedUrl: string; expiresIn: number }> {
  const key = objectKey.trim();
  if (!key || isUnsafeStorageKey(key)) {
    throw new Error('Invalid master object key.');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase server environment variables.');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const bucket = masterBucket();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(key, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? 'Failed to create signed URL.');
  }

  return { signedUrl: data.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS };
}
