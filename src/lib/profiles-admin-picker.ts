import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { createServiceSupabase } from '@/lib/supabase-service';

export type AdminUserOption = {
  id: string;
  label: string;
  email: string | null;
  /** Optional `profiles.is_dev` marker (e.g. seed / tooling); not used for auth. */
  isDev: boolean;
};

function profilesTable(supabase: SupabaseClient) {
  const profilesSchema = process.env.SUPABASE_PROFILES_SCHEMA ?? 'public';
  return profilesSchema === 'public'
    ? supabase.from('profiles')
    : supabase.schema(profilesSchema).from('profiles');
}

/** Escape `%`, `_`, `\` for PostgreSQL ILIKE patterns. */
function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Users from `public.profiles` (same IDs as Clerk `user_*`), for admin grant pickers.
 * Matches what you see in Supabase; may include rows not yet present in Clerk’s user list API.
 */
export async function listProfilesForAdminPicker(
  query?: string | null,
  limit = 200,
): Promise<AdminUserOption[]> {
  const supabase = createServiceSupabase();
  const table = profilesTable(supabase);

  const trimmed = (query?.trim() ?? '').replace(/,/g, '');
  let builder = table
    .select('id, email, display_name, is_dev')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (trimmed) {
    const p = `%${escapeIlikePattern(trimmed)}%`;
    builder = builder.or(`email.ilike.${p},display_name.ilike.${p}`);
  }

  const { data, error } = await builder;

  if (error) {
    console.error('[listProfilesForAdminPicker]', error);
    return [];
  }

  return (data ?? []).map((row) => {
    const id = row.id as string;
    const email = (row.email as string)?.trim() || null;
    const displayName = (row.display_name as string | null)?.trim() || null;
    return {
      id,
      label: displayName || email || id,
      email,
      isDev: Boolean(row.is_dev),
    };
  });
}
