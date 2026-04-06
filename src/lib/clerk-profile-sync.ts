import 'server-only';

import { createClient } from '@supabase/supabase-js';

export type ClerkProfilePayload = {
  id: string;
  email: string;
  displayName: string;
  externalAccounts: Array<{ provider?: string | null }> | null | undefined;
};

function normalizeProvider(provider?: string | null): string {
  if (!provider) return 'email';
  return provider.replace(/^oauth_/, '');
}

function extractProviders(
  externalAccounts: ClerkProfilePayload['externalAccounts'],
): string[] {
  const list = (externalAccounts ?? []).map((acc) =>
    normalizeProvider(acc.provider),
  );
  return Array.from(new Set(list.length ? list : ['email']));
}

function getPreferredProvider(
  externalAccounts: ClerkProfilePayload['externalAccounts'],
): string {
  const accounts = externalAccounts ?? [];
  if (!accounts.length) return 'email';
  return normalizeProvider(accounts[accounts.length - 1]?.provider);
}

/**
 * Upserts `public.profiles` (or SUPABASE_PROFILES_SCHEMA) — shared by Clerk webhook and session sync.
 */
export async function syncClerkProfileToSupabase(
  payload: ClerkProfilePayload,
  webhookEvent: 'user.created' | 'user.updated',
): Promise<{ error: { message: string } | null }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return { error: { message: 'Missing Supabase URL or service role key.' } };
  }

  const profilesSchema = process.env.SUPABASE_PROFILES_SCHEMA ?? 'public';

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const profilesTable =
    profilesSchema === 'public'
      ? supabase.from('profiles')
      : supabase.schema(profilesSchema).from('profiles');

  const providers = extractProviders(payload.externalAccounts);
  const providerName = getPreferredProvider(payload.externalAccounts);

  const { data: existingProfile } = await profilesTable
    .select('auth_provider, auth_providers')
    .eq('id', payload.id)
    .maybeSingle();

  const existingProviders = Array.isArray(existingProfile?.auth_providers)
    ? (existingProfile.auth_providers as string[])
    : [];
  const mergedProviders = Array.from(
    new Set([...existingProviders, ...providers]),
  );
  const hasNewProvider = mergedProviders.length > existingProviders.length;
  const resolvedPrimaryProvider =
    webhookEvent === 'user.created' || hasNewProvider
      ? providerName
      : (existingProfile?.auth_provider ?? providerName);

  const { error } = await profilesTable.upsert(
    {
      id: payload.id,
      email: payload.email,
      display_name: payload.displayName,
      auth_provider: resolvedPrimaryProvider,
      auth_providers: mergedProviders,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );

  if (error) {
    console.error('[clerk-profile-sync]', error);
    return { error: { message: error.message } };
  }

  return { error: null };
}
