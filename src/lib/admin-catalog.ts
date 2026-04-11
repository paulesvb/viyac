import 'server-only';

import { createServiceCatalog } from '@/lib/supabase-catalog';
import type { CatalogTrackRow } from '@/lib/catalog-types';

export type AdminTrackSummary = {
  id: string;
  slug: string;
  title: string;
  visibility: CatalogTrackRow['visibility'];
  featured: boolean;
  anonymous_visible: boolean;
  show_in_home_more_tracks: boolean;
  sort_order: number;
};

/** All catalog tracks (platform admin only — gate callers with `isPlatformAdmin`). */
export async function fetchAllTracksForAdmin(): Promise<AdminTrackSummary[]> {
  const supabase = createServiceCatalog();
  const { data, error } = await supabase
    .from('tracks')
    .select(
      'id, slug, title, visibility, featured, anonymous_visible, sort_order',
    )
    .order('featured', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) {
    console.error('[fetchAllTracksForAdmin]', error);
    return [];
  }

  return (data ?? []) as AdminTrackSummary[];
}

export type AdminTrackPublishing = Pick<
  CatalogTrackRow,
  | 'id'
  | 'slug'
  | 'title'
  | 'visibility'
  | 'featured'
  | 'anonymous_visible'
  | 'show_in_home_more_tracks'
  | 'owner_id'
>;

/** Load one track for publishing form (platform admin only — gate callers). */
export async function fetchTrackPublishingForAdmin(
  trackId: string,
): Promise<AdminTrackPublishing | null> {
  const supabase = createServiceCatalog();
  const { data, error } = await supabase
    .from('tracks')
    .select(
      'id, slug, title, visibility, featured, anonymous_visible, show_in_home_more_tracks, owner_id',
    )
    .eq('id', trackId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('[fetchTrackPublishingForAdmin]', error);
    return null;
  }

  return data as AdminTrackPublishing;
}
