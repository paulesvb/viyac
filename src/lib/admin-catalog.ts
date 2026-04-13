import 'server-only';

import {
  createServiceCatalog,
  formatCatalogPostgrestError,
} from '@/lib/supabase-catalog';
import type { CatalogAlbumRow, CatalogTrackRow } from '@/lib/catalog-types';
import { isCatalogAlbumId, isCatalogTrackId } from '@/lib/catalog-track-id';

function logCatalogQueryFailure(
  scope: string,
  error: { message?: string; code?: string; details?: string; hint?: string },
) {
  console.warn(`[${scope}]`, {
    message: formatCatalogPostgrestError(error.message),
    code: error.code,
    details: error.details,
    hint: error.hint,
  });
}

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
      'id, slug, title, visibility, featured, anonymous_visible, show_in_home_more_tracks, sort_order',
    )
    .order('featured', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) {
    logCatalogQueryFailure('fetchAllTracksForAdmin', error);
    return [];
  }

  return (data ?? []) as AdminTrackSummary[];
}

export type AdminAlbumSummary = {
  id: string;
  slug: string;
  title: string;
  visibility: CatalogAlbumRow['visibility'];
  sort_order: number;
};

/** All catalog albums (platform admin only — gate callers with `isPlatformAdmin`). */
export async function fetchAllAlbumsForAdmin(): Promise<AdminAlbumSummary[]> {
  const supabase = createServiceCatalog();
  const { data, error } = await supabase
    .from('albums')
    .select('id, slug, title, visibility, sort_order')
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) {
    logCatalogQueryFailure('fetchAllAlbumsForAdmin', error);
    return [];
  }

  return (data ?? []) as AdminAlbumSummary[];
}

/** Genesis tracks that are not covers — eligible as “original” when creating a cover. */
export type GenesisOriginalOption = {
  id: string;
  slug: string;
  title: string;
};

/** @param excludeTrackId Optional track id to omit (e.g. editing track cannot pick itself). */
export async function fetchGenesisOriginalsForCoverPicker(
  excludeTrackId?: string | null,
): Promise<GenesisOriginalOption[]> {
  const supabase = createServiceCatalog();
  let q = supabase
    .from('tracks')
    .select('id, slug, title')
    .eq('provenance_type', 'genesis')
    .is('original_track_id', null)
    .order('title', { ascending: true });

  if (excludeTrackId && isCatalogTrackId(excludeTrackId)) {
    q = q.neq('id', excludeTrackId);
  }

  const { data, error } = await q;

  if (error) {
    logCatalogQueryFailure('fetchGenesisOriginalsForCoverPicker', error);
    return [];
  }

  return (data ?? []) as GenesisOriginalOption[];
}

/** Minimal row for UI when a cover’s `original_track_id` is not in the Genesis picker list. */
export async function fetchTrackIdSlugTitleForAdmin(
  trackId: string,
): Promise<GenesisOriginalOption | null> {
  if (!isCatalogTrackId(trackId)) return null;
  const supabase = createServiceCatalog();
  const { data, error } = await supabase
    .from('tracks')
    .select('id, slug, title')
    .eq('id', trackId)
    .maybeSingle();
  if (error || !data) {
    if (error) logCatalogQueryFailure('fetchTrackIdSlugTitleForAdmin', error);
    return null;
  }
  return data as GenesisOriginalOption;
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
  | 'is_cover'
  | 'original_track_id'
  | 'updated_at'
  | 'vault_background_video_path'
  | 'thumbnail_path'
  | 'lock_screen_art_path'
  | 'lyrics'
  | 'lyrics_by'
  | 'instruments'
  | 'is_instrumental'
>;

export type TrackAlbumPlacement = {
  album_assignment: 'single' | 'album';
  /** When `album_assignment` is `album`, the `api.albums.id` this track is linked to. */
  album_id: string;
};

/** Current `album_tracks` placement for edit UI (first link wins if multiple exist). */
export async function fetchTrackAlbumPlacementForAdmin(
  trackId: string,
): Promise<TrackAlbumPlacement> {
  if (!isCatalogTrackId(trackId)) {
    return { album_assignment: 'single', album_id: '' };
  }
  const supabase = createServiceCatalog();
  const { data, error } = await supabase
    .from('album_tracks')
    .select('album_id, sort_order')
    .eq('track_id', trackId)
    .order('sort_order', { ascending: true });

  if (error) {
    logCatalogQueryFailure('fetchTrackAlbumPlacementForAdmin', error);
    return { album_assignment: 'single', album_id: '' };
  }
  const rows = data ?? [];
  if (rows.length === 0) {
    return { album_assignment: 'single', album_id: '' };
  }
  const first = rows[0] as { album_id: string };
  return { album_assignment: 'album', album_id: first.album_id };
}

/** Load one track for publishing form (platform admin only — gate callers). */
export async function fetchTrackPublishingForAdmin(
  trackId: string,
): Promise<AdminTrackPublishing | null> {
  const supabase = createServiceCatalog();
  const { data, error } = await supabase
    .from('tracks')
    .select(
      'id, slug, title, visibility, featured, anonymous_visible, show_in_home_more_tracks, owner_id, is_cover, original_track_id, updated_at, vault_background_video_path, thumbnail_path, lock_screen_art_path, lyrics, lyrics_by, instruments, is_instrumental',
    )
    .eq('id', trackId)
    .maybeSingle();

  if (error || !data) {
    if (error) logCatalogQueryFailure('fetchTrackPublishingForAdmin', error);
    return null;
  }

  return data as AdminTrackPublishing;
}
