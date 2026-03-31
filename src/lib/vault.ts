import 'server-only';

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

import { VAULT_BUCKET } from '@/lib/storage';

const TWO_HOURS_IN_SECONDS = 60 * 60 * 2;

export async function getVaultSignedUrl(trackPath: string): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Unauthorized: user must be signed in.');
  }

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
