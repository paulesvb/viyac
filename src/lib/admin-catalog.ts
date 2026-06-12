import 'server-only';

import {
  createServiceCatalog,
  formatCatalogPostgrestError,
} from '@/lib/supabase-catalog';
import type { CatalogAlbumRow, CatalogTrackRow } from '@/lib/catalog-types';
import { isCatalogAlbumId, isCatalogTrackId } from '@/lib/catalog-track-id';
import { getClerkUserLabelsByIds } from '@/lib/clerk-admin-users';

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
  show_home: boolean;
  sort_order: number;
};

/** All catalog tracks (platform admin only — gate callers with `isPlatformAdmin`). */
export async function fetchAllTracksForAdmin(): Promise<AdminTrackSummary[]> {
  const supabase = createServiceCatalog();
  const { data, error } = await supabase
    .from('tracks')
    .select(
      'id, slug, title, visibility, featured, anonymous_visible, show_home, sort_order',
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
  card_badge_label: string | null;
};

/** All catalog albums (platform admin only — gate callers with `isPlatformAdmin`). */
export async function fetchAllAlbumsForAdmin(): Promise<AdminAlbumSummary[]> {
  const supabase = createServiceCatalog();
  const { data, error } = await supabase
    .from('albums')
    .select('id, slug, title, visibility, sort_order, card_badge_label')
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) {
    logCatalogQueryFailure('fetchAllAlbumsForAdmin', error);
    return [];
  }

  return (data ?? []) as AdminAlbumSummary[];
}

export type AdminAlbumTrackRow = {
  track_id: string;
  sort_order: number;
  slug: string;
  title: string;
  visibility: CatalogTrackRow['visibility'];
};

export type AdminAlbumWithTracks = {
  id: string;
  slug: string;
  title: string;
  visibility: CatalogAlbumRow['visibility'];
  tracks: AdminAlbumTrackRow[];
};

type AlbumTrackJoinRow = {
  track_id: string;
  sort_order: number;
  tracks:
    | Pick<CatalogTrackRow, 'id' | 'slug' | 'title' | 'visibility'>
    | Pick<CatalogTrackRow, 'id' | 'slug' | 'title' | 'visibility'>[]
    | null;
};

/** One album and its tracks in `album_tracks.sort_order` (platform admin only). */
export async function fetchAlbumWithTracksForAdmin(
  albumId: string,
): Promise<AdminAlbumWithTracks | null> {
  if (!isCatalogAlbumId(albumId)) return null;

  const supabase = createServiceCatalog();
  const { data: album, error: albumError } = await supabase
    .from('albums')
    .select('id, slug, title, visibility')
    .eq('id', albumId)
    .maybeSingle();

  if (albumError || !album) {
    if (albumError) logCatalogQueryFailure('fetchAlbumWithTracksForAdmin', albumError);
    return null;
  }

  const { data: links, error: linksError } = await supabase
    .from('album_tracks')
    .select('track_id, sort_order, tracks ( id, slug, title, visibility )')
    .eq('album_id', albumId)
    .order('sort_order', { ascending: true });

  if (linksError) {
    logCatalogQueryFailure('fetchAlbumWithTracksForAdmin links', linksError);
    return null;
  }

  const tracks: AdminAlbumTrackRow[] = [];
  for (const row of (links ?? []) as AlbumTrackJoinRow[]) {
    const joined = Array.isArray(row.tracks) ? row.tracks[0] : row.tracks;
    if (!joined?.slug?.trim()) continue;
    tracks.push({
      track_id: row.track_id,
      sort_order: row.sort_order,
      slug: joined.slug.trim(),
      title: joined.title?.trim() || '(untitled track)',
      visibility: joined.visibility,
    });
  }

  return {
    ...(album as Pick<AdminAlbumWithTracks, 'id' | 'slug' | 'title' | 'visibility'>),
    tracks,
  };
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
  | 'provenance_type'
  | 'featured'
  | 'anonymous_visible'
  | 'show_home'
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
      'id, slug, title, visibility, provenance_type, featured, anonymous_visible, show_home, owner_id, is_cover, original_track_id, updated_at, vault_background_video_path, thumbnail_path, lock_screen_art_path, lyrics, lyrics_by, instruments, is_instrumental',
    )
    .eq('id', trackId)
    .maybeSingle();

  if (error || !data) {
    if (error) logCatalogQueryFailure('fetchTrackPublishingForAdmin', error);
    return null;
  }

  return data as AdminTrackPublishing;
}

type AdminTrackHideJoinRow = {
  track_id: string;
  viewer_user_id: string;
  hidden_at: string;
  tracks: { title: string; slug: string } | { title: string; slug: string }[] | null;
};

export type AdminTrackHideSummary = {
  track_id: string;
  viewer_user_id: string;
  hidden_at: string;
  track_title: string;
  track_slug: string;
  viewer_label: string;
};

export async function fetchTrackViewerHidesForAdmin(): Promise<AdminTrackHideSummary[]> {
  const supabase = createServiceCatalog();
  const { data, error } = await supabase
    .from('catalog_track_viewer_hides')
    .select('track_id, viewer_user_id, hidden_at, tracks ( title, slug )')
    .order('hidden_at', { ascending: false });

  if (error) {
    logCatalogQueryFailure('fetchTrackViewerHidesForAdmin', error);
    return [];
  }

  const rows = (data ?? []) as AdminTrackHideJoinRow[];
  if (rows.length === 0) return [];

  const viewerIds = [...new Set(rows.map((row) => row.viewer_user_id))];
  const labelsById = await getClerkUserLabelsByIds(viewerIds);

  return rows
    .map((row) => {
      const joined = Array.isArray(row.tracks) ? row.tracks[0] : row.tracks;
      if (!joined?.slug?.trim()) return null;
      return {
        track_id: row.track_id,
        viewer_user_id: row.viewer_user_id,
        hidden_at: row.hidden_at,
        track_title: joined.title?.trim() || '(untitled track)',
        track_slug: joined.slug.trim(),
        viewer_label: labelsById.get(row.viewer_user_id) ?? row.viewer_user_id,
      };
    })
    .filter((row): row is AdminTrackHideSummary => row != null);
}
