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

/** Plain object for logs — PostgREST `Error` subclasses often show as `{}` in the Next.js dev overlay. */
function supabaseErrorFields(err: unknown): Record<string, string> {
  if (!err || typeof err !== 'object') {
    return { message: String(err) };
  }
  const o = err as Record<string, unknown>;
  const pick = (k: string) =>
    typeof o[k] === 'string' && o[k] ? { [k]: o[k] as string } : {};
  return {
    message:
      typeof o.message === 'string' && o.message
        ? o.message
        : 'Supabase request failed',
    ...pick('code'),
    ...pick('details'),
    ...pick('hint'),
  };
}

/**
 * Upserts `public.profiles` (or SUPABASE_PROFILES_SCHEMA) — used from the Clerk webhook.
 */
export type SyncClerkProfileOptions = {
  /** When true, sets `profiles.is_dev` (reserved for tooling; webhooks pass false). */
  isDevProfile?: boolean;
};

export async function syncClerkProfileToSupabase(
  payload: ClerkProfilePayload,
  webhookEvent: 'user.created' | 'user.updated',
  options?: SyncClerkProfileOptions,
): Promise<{ error: { message: string } | null }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return { error: { message: 'Missing Supabase URL or service role key.' } };
  }

  const profilesSchema = process.env.SUPABASE_PROFILES_SCHEMA ?? 'public';

  if (process.env.NODE_ENV === 'development' && profilesSchema === 'api') {
    console.warn(
      '[clerk-profile-sync] SUPABASE_PROFILES_SCHEMA=api — migrations only create public.profiles. Unset this env var or set it to public.',
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const profilesTable =
    profilesSchema === 'public'
      ? supabase.from('profiles')
      : supabase.schema(profilesSchema).from('profiles');

  const providers = extractProviders(payload.externalAccounts);
  const providerName = getPreferredProvider(payload.externalAccounts);

  const { data: existingProfile, error: selectError } = await profilesTable
    .select('auth_provider, auth_providers')
    .eq('id', payload.id)
    .maybeSingle();

  if (selectError) {
    console.error(
      '[clerk-profile-sync] profiles select',
      supabaseErrorFields(selectError),
    );
    return {
      error: {
        message:
          selectError.message ||
          'Could not read profiles row (check SUPABASE_PROFILES_SCHEMA and migrations).',
      },
    };
  }

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

  const isDevProfile = options?.isDevProfile === true;

  const { error } = await profilesTable.upsert(
    {
      id: payload.id,
      email: payload.email,
      display_name: payload.displayName,
      auth_provider: resolvedPrimaryProvider,
      auth_providers: mergedProviders,
      updated_at: new Date().toISOString(),
      is_dev: isDevProfile,
    },
    { onConflict: 'id' },
  );

  if (error) {
    console.error('[clerk-profile-sync] profiles upsert', supabaseErrorFields(error));
    return {
      error: {
        message:
          error.message ||
          'Profile upsert failed (see server log for code/details).',
      },
    };
  }

  return { error: null };
}
