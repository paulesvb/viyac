import 'server-only';

import { createServiceCatalog } from '@/lib/supabase-catalog';

type CatalogClient = ReturnType<typeof createServiceCatalog>;

export async function catalogTrackHasViewerGrant(
  supabase: CatalogClient,
  trackId: string,
  viewerUserId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('catalog_track_viewers')
    .select('track_id')
    .eq('track_id', trackId)
    .eq('viewer_user_id', viewerUserId)
    .maybeSingle();

  if (error) {
    console.error('[catalogTrackHasViewerGrant]', error);
    return false;
  }
  return data != null;
}

export async function fetchViewerUserIdsForTrack(
  trackId: string,
): Promise<string[]> {
  const supabase = createServiceCatalog();
  const { data, error } = await supabase
    .from('catalog_track_viewers')
    .select('viewer_user_id')
    .eq('track_id', trackId);

  if (error) {
    console.error('[fetchViewerUserIdsForTrack]', error);
    return [];
  }
  return (data ?? []).map((r) => r.viewer_user_id as string);
}
