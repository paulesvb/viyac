import 'server-only';

import { createServiceCatalog } from '@/lib/supabase-catalog';

/** Public/unlisted collections (and their tracks) are playable without sign-in. */
export const ANONYMOUS_COLLECTION_ACCESS_FLAG = 'anonymous_collection_access';

/**
 * Reads `api.feature_flags`. Missing table or row fails closed (sign-in required).
 * Flip with:
 * `UPDATE api.feature_flags SET enabled = true, updated_at = now() WHERE key = 'anonymous_collection_access';`
 */
export async function isAnonymousCollectionAccessEnabled(): Promise<boolean> {
  try {
    const supabase = createServiceCatalog();
    const { data, error } = await supabase
      .from('feature_flags')
      .select('enabled')
      .eq('key', ANONYMOUS_COLLECTION_ACCESS_FLAG)
      .maybeSingle();

    if (error || !data) return false;
    return data.enabled === true;
  } catch (e) {
    console.error('[isAnonymousCollectionAccessEnabled]', e);
    return false;
  }
}
