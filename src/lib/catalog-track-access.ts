import type { SupabaseClient } from '@supabase/supabase-js';

import type { CatalogTrackRow } from '@/lib/catalog-types';

/**
 * Returns the track row if `userId` may access it for playback/catalog (matches tracks RLS idea).
 */
export async function getCatalogTrackIfAccessible(
  supabase: SupabaseClient,
  userId: string,
  trackId: string,
): Promise<CatalogTrackRow | null> {
  const { data: track, error: trackError } = await supabase
    .from('tracks')
    .select('*')
    .eq('id', trackId)
    .maybeSingle();

  if (trackError || !track) return null;

  const row = track as CatalogTrackRow;
  if (row.owner_id === userId) return row;
  if (row.visibility === 'public' || row.visibility === 'unlisted') return row;

  const { data: viaAlbum } = await supabase
    .from('album_tracks')
    .select('album_id')
    .eq('track_id', trackId)
    .limit(50);

  const albumIds = (viaAlbum ?? []).map((r) => r.album_id as string);
  if (albumIds.length === 0) return null;

  const { data: albums } = await supabase
    .from('albums')
    .select('id,visibility')
    .in('id', albumIds);

  const anyPublic = (albums ?? []).some(
    (a) => a.visibility === 'public' || a.visibility === 'unlisted',
  );
  return anyPublic ? row : null;
}
