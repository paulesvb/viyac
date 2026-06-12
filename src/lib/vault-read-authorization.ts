import 'server-only';

import {
  vaultObjectPathMatchesTrack,
  vaultPathAllowedForAnonymous,
  vaultPathAllowedForUser,
} from '@/lib/catalog-track-access';
import { getDashboardTracks } from '@/lib/dashboard-tracks';
import { createServiceCatalog } from '@/lib/supabase-catalog';

function dashboardStaticVaultAllows(objectPath: string): boolean {
  const o = objectPath.trim().replace(/^\/+/, '');
  if (!o) return false;
  for (const t of getDashboardTracks()) {
    const paths = [
      t.track_path,
      t.waveform_json_vault_path,
      t.vault_background_video_path,
    ].filter((p): p is string => Boolean(p?.trim()));
    for (const p of paths) {
      if (vaultObjectPathMatchesTrack(o, p)) return true;
    }
  }
  return false;
}

/** Signed-in: catalog access or dashboard env paths. Signed-out: anonymous_visible preview tracks only. */
export async function vaultReadAllowed(
  userId: string | null | undefined,
  objectPath: string,
): Promise<boolean> {
  const supabase = createServiceCatalog();
  if (userId) {
    if (await vaultPathAllowedForUser(supabase, userId, objectPath)) return true;
    return dashboardStaticVaultAllows(objectPath);
  }
  if (await vaultPathAllowedForAnonymous(supabase, objectPath)) return true;
  return dashboardStaticVaultAllows(objectPath);
}

/** Clerk session required; path must match catalog access or dashboard config/env vault paths. */
export async function vaultReadAllowedForUser(
  userId: string,
  objectPath: string,
): Promise<boolean> {
  return vaultReadAllowed(userId, objectPath);
}
