import 'server-only';

import { isPlatformAdmin } from '@/lib/admin-access';
import { getClerkUserLabelsByIds } from '@/lib/clerk-admin-users';
import {
  createServiceCatalog,
  formatCatalogPostgrestError,
} from '@/lib/supabase-catalog';
import type { CatalogAlbumRow, CatalogTrackRow } from '@/lib/catalog-types';
import { isMasteringProvenance } from '@/lib/catalog-types';
import {
  getCatalogTrackIfAccessible,
  getCatalogTrackIfAnonymousAccessible,
  listAnonymousAccessibleCatalogTrackRows,
} from '@/lib/catalog-track-access';
import type { DashboardTrack } from '@/lib/dashboard-track-types';
import { normalizeTagList } from '@/lib/track-meta';

type AlbumsJoinRow = {
  track_id: string;
  albums: { visibility: string } | { visibility: string }[] | null;
};

export type DashboardAlbum = {
  id: string;
  slug: string;
  title: string;
  cover_image_path?: string;
  track_count: number;
  /** From `api.albums.card_badge_label`; omitted when empty. */
  card_badge_label?: string;
};

type AlbumTrackJoinRow = {
  track_id: string;
  sort_order: number;
  tracks: CatalogTrackRow | CatalogTrackRow[] | null;
};

type ViewerGrantRow = {
  track_id: string;
  viewer_user_id: string;
};

type ViewerHideRow = {
  track_id: string;
};

function albumVisibility(
  albums: AlbumsJoinRow['albums'],
): string | undefined {
  if (!albums) return undefined;
  const row = Array.isArray(albums) ? albums[0] : albums;
  return row?.visibility;
}

function joinTrack(
  tracks: AlbumTrackJoinRow['tracks'],
): CatalogTrackRow | null {
  if (!tracks) return null;
  return Array.isArray(tracks) ? (tracks[0] ?? null) : tracks;
}

function dashboardAlbumBadgeLabel(
  raw: string | null | undefined,
): string | undefined {
  const label = raw?.trim();
  return label ? label : undefined;
}

/** Track IDs that appear in at least one `album_tracks` row. */
async function fetchTrackIdsLinkedToAlbums(
  supabase: ReturnType<typeof createServiceCatalog>,
  trackIds: string[],
): Promise<Set<string>> {
  if (trackIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from('album_tracks')
    .select('track_id')
    .in('track_id', trackIds);
  if (error || !data?.length) return new Set();
  return new Set(data.map((r) => r.track_id as string));
}

async function isTrackLinkedToAnyAlbum(
  supabase: ReturnType<typeof createServiceCatalog>,
  trackId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('album_tracks')
    .select('track_id')
    .eq('track_id', trackId)
    .limit(1);
  if (error) return false;
  return (data?.length ?? 0) > 0;
}

type AlbumTitleJoinRow = {
  track_id: string;
  albums: { title: string; sort_order: number } | { title: string; sort_order: number }[] | null;
};

/** One display title per track when it appears on album(s): lowest `albums.sort_order`, then title. */
async function fetchPrimaryAlbumTitleByTrackIds(
  supabase: ReturnType<typeof createServiceCatalog>,
  trackIds: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (trackIds.length === 0) return out;
  const { data, error } = await supabase
    .from('album_tracks')
    .select('track_id, albums ( title, sort_order )')
    .in('track_id', trackIds);
  if (error || !data?.length) return out;

  const best = new Map<string, { sort_order: number; title: string }>();
  for (const raw of data as AlbumTitleJoinRow[]) {
    const tid = raw.track_id as string;
    const al = raw.albums;
    if (!al) continue;
    const album = Array.isArray(al) ? al[0] : al;
    if (!album?.title?.trim()) continue;
    const so = album.sort_order ?? 0;
    const title = album.title.trim();
    const prev = best.get(tid);
    if (
      !prev ||
      so < prev.sort_order ||
      (so === prev.sort_order && title.localeCompare(prev.title) < 0)
    ) {
      best.set(tid, { sort_order: so, title });
    }
  }
  for (const [tid, v] of best) {
    out.set(tid, v.title);
  }
  return out;
}

function sortCatalogTrackRows(rows: CatalogTrackRow[]): CatalogTrackRow[] {
  return [...rows].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.title.localeCompare(b.title);
  });
}

/**
 * Tracks the signed-in user may play: owned, explicit viewer grants, public/unlisted,
 * on a public/unlisted album, or (platform admin) any catalog track.
 */
export async function listAccessibleCatalogTrackRows(
  userId: string,
): Promise<CatalogTrackRow[]> {
  const supabase = createServiceCatalog();

  if (isPlatformAdmin(userId)) {
    const { data, error } = await supabase.from('tracks').select('*');
    if (error) {
      console.error('[listAccessibleCatalogTrackRows] admin', error);
      return [];
    }
    return sortCatalogTrackRows((data ?? []) as CatalogTrackRow[]);
  }

  const [{ data: owned }, { data: visible }, { data: atRows }, { data: grantRows }] =
    await Promise.all([
      supabase.from('tracks').select('*').eq('owner_id', userId),
      supabase.from('tracks').select('*').in('visibility', ['public', 'unlisted']),
      supabase.from('album_tracks').select('track_id, albums ( visibility )'),
      supabase
        .from('catalog_track_viewers')
        .select('track_id')
        .eq('viewer_user_id', userId),
    ]);

  const grantIds = new Set(
    (grantRows ?? []).map((r) => r.track_id as string).filter(Boolean),
  );
  let grantedTracks: CatalogTrackRow[] = [];
  if (grantIds.size > 0) {
    const { data: gt, error: grantTracksError } = await supabase
      .from('tracks')
      .select('*')
      .in('id', Array.from(grantIds));
    if (grantTracksError) {
      console.error('[listAccessibleCatalogTrackRows] granted', grantTracksError);
    } else {
      grantedTracks = (gt ?? []) as CatalogTrackRow[];
    }
  }

  const viaAlbumIds = new Set<string>();
  for (const r of (atRows ?? []) as AlbumsJoinRow[]) {
    const v = albumVisibility(r.albums);
    if (v === 'public' || v === 'unlisted') {
      viaAlbumIds.add(r.track_id as string);
    }
  }

  let viaAlbumTracks: CatalogTrackRow[] = [];
  if (viaAlbumIds.size > 0) {
    const { data: va } = await supabase
      .from('tracks')
      .select('*')
      .in('id', Array.from(viaAlbumIds));
    viaAlbumTracks = (va ?? []) as CatalogTrackRow[];
  }

  const map = new Map<string, CatalogTrackRow>();
  for (const t of [
    ...((owned ?? []) as CatalogTrackRow[]),
    ...((visible ?? []) as CatalogTrackRow[]),
    ...viaAlbumTracks,
    ...grantedTracks,
  ]) {
    map.set(t.id, t);
  }

  return sortCatalogTrackRows(Array.from(map.values()));
}

/**
 * Tracks for Home list only: world-readable by visibility or via public/unlisted album.
 * Does not list private tracks just because you own them (use Admin for drafts).
 * Requires `show_home` (opt-in). DB default for new tracks is `private`; create flow sends visibility explicitly.
 */
export async function listHomeCatalogTrackRows(): Promise<CatalogTrackRow[]> {
  const supabase = createServiceCatalog();

  const [{ data: visible }, { data: atRows }, { data: grantRows }] =
    await Promise.all([
      supabase.from('tracks').select('*').in('visibility', ['public', 'unlisted']),
      supabase.from('album_tracks').select('track_id, albums ( visibility )'),
      supabase.from('catalog_track_viewers').select('track_id'),
    ]);

  const viaAlbumIds = new Set<string>();
  for (const r of (atRows ?? []) as AlbumsJoinRow[]) {
    const v = albumVisibility(r.albums);
    if (v === 'public' || v === 'unlisted') {
      viaAlbumIds.add(r.track_id as string);
    }
  }

  let viaAlbumTracks: CatalogTrackRow[] = [];
  if (viaAlbumIds.size > 0) {
    const { data: va } = await supabase
      .from('tracks')
      .select('*')
      .in('id', Array.from(viaAlbumIds));
    viaAlbumTracks = (va ?? []) as CatalogTrackRow[];
  }

  const map = new Map<string, CatalogTrackRow>();
  for (const t of [
    ...((visible ?? []) as CatalogTrackRow[]),
    ...viaAlbumTracks,
  ]) {
    map.set(t.id, t);
  }

  const sharedTrackIds = new Set(
    ((grantRows ?? []) as ViewerHideRow[]).map((row) => row.track_id),
  );
  const rows = Array.from(map.values()).filter(
    (row) => !sharedTrackIds.has(row.id) && row.show_home === true,
  );
  return sortCatalogTrackRows(rows);
}

export function catalogRowToDashboardTrack(
  row: CatalogTrackRow,
  featured: boolean,
  extras?: { is_single?: boolean; album_title?: string },
): DashboardTrack {
  return {
    slug: row.slug,
    title: row.title,
    track_path: row.track_path,
    featured,
    content_type: row.content_type === 'audio' ? 'audio' : 'video',
    description_en: row.description_en ?? undefined,
    description_es: row.description_es ?? undefined,
    ...(row.lyrics?.trim() ? { lyrics: row.lyrics.trim() } : {}),
    ...(row.lyrics_by?.trim() ? { lyrics_by: row.lyrics_by.trim() } : {}),
    provenance_type: row.provenance_type ?? undefined,
    ...(row.mastering_provenance &&
    isMasteringProvenance(row.mastering_provenance)
      ? { mastering_provenance: row.mastering_provenance }
      : {}),
    genres: normalizeTagList(row.genres),
    instruments: normalizeTagList(row.instruments),
    is_instrumental: Boolean(row.is_instrumental),
    ...(extras?.is_single !== undefined ? { is_single: extras.is_single } : {}),
    ...(extras?.album_title?.trim()
      ? { album_title: extras.album_title.trim() }
      : {}),
    release_date: row.release_date ?? undefined,
    duration_ms: row.duration_ms ?? undefined,
    waveform_json_path: row.waveform_json_path ?? undefined,
    waveform_json_vault_path: row.waveform_json_vault_path ?? undefined,
    vault_background_video_path: row.vault_background_video_path ?? undefined,
    thumbnail_url: row.thumbnail_path ?? undefined,
    bg_image_path: row.thumbnail_path ?? undefined,
    lock_screen_art_path: row.lock_screen_art_path ?? row.thumbnail_path ?? undefined,
    catalog_track_id: row.id,
    ...(row.anonymous_visible
      ? { anonymous_visible: true as const }
      : {}),
    ...(row.show_home === false ? { show_home: false as const } : {}),
  };
}

/** Anonymous preview tracks for Home (show_home + world-readable). */
export async function fetchAnonymousHomeTracksFromCatalog(): Promise<DashboardTrack[]> {
  try {
    const homeRows = await listHomeCatalogTrackRows();
    if (homeRows.length === 0) return [];
    const supabase = createServiceCatalog();
    const hasFeatured = homeRows.some((r) => r.featured);
    const trackIds = homeRows.map((r) => r.id);
    const onAlbumIds = await fetchTrackIdsLinkedToAlbums(supabase, trackIds);
    const albumTitles = await fetchPrimaryAlbumTitleByTrackIds(
      supabase,
      trackIds,
    );
    return homeRows.map((r, i) => {
      const onAlbum = onAlbumIds.has(r.id);
      const albumTitle = albumTitles.get(r.id);
      return {
        ...catalogRowToDashboardTrack(r, hasFeatured ? r.featured : i === 0, {
          is_single: !onAlbum,
          ...(onAlbum && albumTitle ? { album_title: albumTitle } : {}),
        }),
        anonymous_visible: true as const,
      };
    });
  } catch (e) {
    console.error('[fetchAnonymousHomeTracksFromCatalog]', e);
    return [];
  }
}
export async function fetchAnonymousLandingTracks(): Promise<DashboardTrack[]> {
  try {
    const supabase = createServiceCatalog();
    const rows = await listAnonymousAccessibleCatalogTrackRows(supabase);
    if (rows.length === 0) return [];
    const hasFeatured = rows.some((r) => r.featured);
    const trackIds = rows.map((r) => r.id);
    const onAlbumIds = await fetchTrackIdsLinkedToAlbums(supabase, trackIds);
    const albumTitles = await fetchPrimaryAlbumTitleByTrackIds(
      supabase,
      trackIds,
    );
    return rows.map((r, i) => {
      const onAlbum = onAlbumIds.has(r.id);
      const albumTitle = albumTitles.get(r.id);
      return {
        ...catalogRowToDashboardTrack(r, hasFeatured ? r.featured : i === 0, {
          is_single: !onAlbum,
          ...(onAlbum && albumTitle ? { album_title: albumTitle } : {}),
        }),
        anonymous_visible: true as const,
      };
    });
  } catch (e) {
    console.error('[fetchAnonymousLandingTracks]', e);
    return [];
  }
}

/** Catalog-backed list for the dashboard (empty if none or error). */
export async function fetchDashboardTracksFromCatalog(
  _userId: string,
): Promise<DashboardTrack[]> {
  try {
    const rows = await listHomeCatalogTrackRows();
    if (rows.length === 0) return [];
    const hasFeatured = rows.some((r) => r.featured);
    const supabase = createServiceCatalog();
    const trackIds = rows.map((r) => r.id);
    const onAlbumIds = await fetchTrackIdsLinkedToAlbums(supabase, trackIds);
    const albumTitles = await fetchPrimaryAlbumTitleByTrackIds(
      supabase,
      trackIds,
    );
    return rows.map((r, i) => {
      const onAlbum = onAlbumIds.has(r.id);
      const albumTitle = albumTitles.get(r.id);
      return catalogRowToDashboardTrack(r, hasFeatured ? r.featured : i === 0, {
        is_single: !onAlbum,
        ...(onAlbum && albumTitle ? { album_title: albumTitle } : {}),
      });
    });
  } catch (e) {
    console.error('[fetchDashboardTracksFromCatalog]', e);
    return [];
  }
}

export async function fetchSharedTracksFromCatalog(
  userId: string,
): Promise<DashboardTrack[]> {
  try {
    const supabase = createServiceCatalog();
    const [{ data: grantRows }, { data: hiddenRows }] = await Promise.all([
      supabase
        .from('catalog_track_viewers')
        .select('track_id')
        .eq('viewer_user_id', userId),
      supabase
        .from('catalog_track_viewer_hides')
        .select('track_id')
        .eq('viewer_user_id', userId),
    ]);

    const hiddenIds = new Set(
      ((hiddenRows ?? []) as ViewerHideRow[]).map((r) => r.track_id),
    );
    const trackIds = [
      ...new Set(
        ((grantRows ?? []) as ViewerHideRow[])
          .map((r) => r.track_id)
          .filter((id) => !hiddenIds.has(id)),
      ),
    ];
    if (trackIds.length === 0) return [];

    const [{ data: tracks, error: tracksError }, { data: allViewerRows }] =
      await Promise.all([
        supabase.from('tracks').select('*').in('id', trackIds),
        supabase
          .from('catalog_track_viewers')
          .select('track_id, viewer_user_id')
          .in('track_id', trackIds),
      ]);

    if (tracksError || !tracks?.length) {
      if (tracksError) {
        console.error('[fetchSharedTracksFromCatalog] tracks', tracksError);
      }
      return [];
    }

    const rows = sortCatalogTrackRows((tracks ?? []) as CatalogTrackRow[]);
    const viewerByTrackId = new Map<string, string[]>();
    const otherViewerIds = new Set<string>();
    for (const row of (allViewerRows ?? []) as ViewerGrantRow[]) {
      const list = viewerByTrackId.get(row.track_id) ?? [];
      list.push(row.viewer_user_id);
      viewerByTrackId.set(row.track_id, list);
      if (row.viewer_user_id !== userId) {
        otherViewerIds.add(row.viewer_user_id);
      }
    }
    const labelsById = await getClerkUserLabelsByIds(Array.from(otherViewerIds));

    const trackIdsSorted = rows.map((r) => r.id);
    const onAlbumIds = await fetchTrackIdsLinkedToAlbums(supabase, trackIdsSorted);
    const albumTitles = await fetchPrimaryAlbumTitleByTrackIds(
      supabase,
      trackIdsSorted,
    );

    return rows.map((r) => {
      const onAlbum = onAlbumIds.has(r.id);
      const albumTitle = albumTitles.get(r.id);
      const others = (viewerByTrackId.get(r.id) ?? []).filter((id) => id !== userId);
      const otherNames = [...new Set(others)].map((id) => labelsById.get(id) ?? id);
      return {
        ...catalogRowToDashboardTrack(r, false, {
          is_single: !onAlbum,
          ...(onAlbum && albumTitle ? { album_title: albumTitle } : {}),
        }),
        shared_with_others_count: otherNames.length,
        shared_with_others_names: otherNames,
      };
    });
  } catch (e) {
    console.error('[fetchSharedTracksFromCatalog]', e);
    return [];
  }
}

export async function hasSharedTracksForViewer(userId: string): Promise<boolean> {
  const count = await fetchSharedTracksCountForViewer(userId);
  return count > 0;
}

export async function fetchSharedTracksCountForViewer(
  userId: string,
): Promise<number> {
  const supabase = createServiceCatalog();
  const { data, error } = await supabase.rpc(
    'count_visible_shared_tracks_for_viewer',
    {
      p_viewer_user_id: userId,
    },
  );

  if (error) {
    console.warn(
      '[fetchSharedTracksCountForViewer] rpc fallback',
      formatCatalogPostgrestError(
        typeof error.message === 'string' ? error.message : undefined,
      ),
    );
    const [{ data: grants, error: grantsError }, { data: hidden, error: hiddenError }] =
      await Promise.all([
        supabase
          .from('catalog_track_viewers')
          .select('track_id')
          .eq('viewer_user_id', userId),
        supabase
          .from('catalog_track_viewer_hides')
          .select('track_id')
          .eq('viewer_user_id', userId),
      ]);

    if (grantsError || hiddenError) {
      if (grantsError) {
        console.error(
          '[fetchSharedTracksCountForViewer] grants',
          formatCatalogPostgrestError(grantsError.message),
        );
      }
      if (hiddenError) {
        console.error(
          '[fetchSharedTracksCountForViewer] hidden',
          formatCatalogPostgrestError(hiddenError.message),
        );
      }
      return 0;
    }

    const grantIds = new Set(
      ((grants ?? []) as ViewerHideRow[]).map((row) => row.track_id).filter(Boolean),
    );
    const hiddenIds = new Set(
      ((hidden ?? []) as ViewerHideRow[]).map((row) => row.track_id).filter(Boolean),
    );
    let count = 0;
    for (const id of grantIds) {
      if (!hiddenIds.has(id)) count += 1;
    }
    return count;
  }

  const count = typeof data === 'number' ? data : Number(data ?? 0);
  if (!Number.isFinite(count) || count <= 0) return 0;
  return Math.trunc(count);
}

type FavoriteRow = {
  track_id: string;
  created_at: string;
};

export async function fetchCatalogTrackFavoritesCount(
  userId: string,
): Promise<number> {
  const supabase = createServiceCatalog();
  const { count, error } = await supabase
    .from('catalog_track_favorites')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    console.error('[fetchCatalogTrackFavoritesCount]', error);
    return 0;
  }
  return typeof count === 'number' && count > 0 ? count : 0;
}

export async function fetchFavoriteTracksFromCatalog(
  userId: string,
): Promise<DashboardTrack[]> {
  try {
    const supabase = createServiceCatalog();
    const { data: favRows, error: favError } = await supabase
      .from('catalog_track_favorites')
      .select('track_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (favError || !favRows?.length) {
      if (favError) {
        console.error('[fetchFavoriteTracksFromCatalog] favorites', favError);
      }
      return [];
    }

    const orderedIds = (favRows as FavoriteRow[]).map((r) => r.track_id);
    const tracks: DashboardTrack[] = [];
    for (const id of orderedIds) {
      const row = await getCatalogTrackIfAccessible(supabase, userId, id);
      if (!row) continue;
      const linked = await isTrackLinkedToAnyAlbum(supabase, row.id);
      const albumTitles = linked
        ? await fetchPrimaryAlbumTitleByTrackIds(supabase, [row.id])
        : new Map<string, string>();
      const albumTitle = albumTitles.get(row.id);
      tracks.push(
        catalogRowToDashboardTrack(row, false, {
          is_single: !linked,
          ...(linked && albumTitle ? { album_title: albumTitle } : {}),
        }),
      );
    }
    return tracks;
  } catch (e) {
    console.error('[fetchFavoriteTracksFromCatalog]', e);
    return [];
  }
}

/**
 * Public/unlisted albums for anonymous Home teasers (cover + metadata; playback requires sign-in).
 */
export async function fetchPublicDashboardAlbumsFromCatalog(): Promise<
  DashboardAlbum[]
> {
  try {
    const supabase = createServiceCatalog();
    const { data: albums, error } = await supabase
      .from('albums')
      .select('*')
      .in('visibility', ['public', 'unlisted'])
      .order('sort_order', { ascending: true })
      .order('title', { ascending: true });

    if (error || !albums?.length) return [];

    const out: DashboardAlbum[] = [];
    for (const a of albums as CatalogAlbumRow[]) {
      const { data: links } = await supabase
        .from('album_tracks')
        .select('track_id')
        .eq('album_id', a.id);
      const count = links?.length ?? 0;
      if (count === 0) continue;

      const badge = dashboardAlbumBadgeLabel(a.card_badge_label);
      out.push({
        id: a.id,
        slug: a.slug,
        title: a.title,
        cover_image_path: a.cover_image_path ?? undefined,
        track_count: count,
        ...(badge ? { card_badge_label: badge } : {}),
      });
    }
    return out;
  } catch (e) {
    console.error('[fetchPublicDashboardAlbumsFromCatalog]', e);
    return [];
  }
}

/**
 * Albums visible on dashboard: owned + public/unlisted with at least one accessible track.
 */
export async function fetchDashboardAlbumsFromCatalog(
  userId: string,
): Promise<DashboardAlbum[]> {
  try {
    const supabase = createServiceCatalog();
    const { data: albums, error } = await supabase
      .from('albums')
      .select('*')
      .or(`owner_id.eq.${userId},visibility.eq.public,visibility.eq.unlisted`)
      .order('sort_order', { ascending: true })
      .order('title', { ascending: true });

    if (error || !albums?.length) return [];

    const out: DashboardAlbum[] = [];
    for (const a of albums as CatalogAlbumRow[]) {
      const { data: links } = await supabase
        .from('album_tracks')
        .select('track_id')
        .eq('album_id', a.id);
      const ids = (links ?? []).map((r) => r.track_id as string);
      if (ids.length === 0) continue;

      let count = 0;
      for (const id of ids) {
        const allowed = await getCatalogTrackIfAccessible(supabase, userId, id);
        if (allowed) count += 1;
      }
      if (count === 0) continue;

      const badge = dashboardAlbumBadgeLabel(a.card_badge_label);
      out.push({
        id: a.id,
        slug: a.slug,
        title: a.title,
        cover_image_path: a.cover_image_path ?? undefined,
        track_count: count,
        ...(badge ? { card_badge_label: badge } : {}),
      });
    }
    return out;
  } catch (e) {
    console.error('[fetchDashboardAlbumsFromCatalog]', e);
    return [];
  }
}

export type AlbumWithTracks = {
  album: CatalogAlbumRow;
  tracks: DashboardTrack[];
};

export async function getAccessibleAlbumWithTracksBySlug(
  userId: string,
  slug: string,
): Promise<AlbumWithTracks | null> {
  const supabase = createServiceCatalog();
  const decoded = decodeURIComponent(slug);
  const { data: album, error } = await supabase
    .from('albums')
    .select('*')
    .eq('slug', decoded)
    .maybeSingle();

  if (error || !album) return null;
  const a = album as CatalogAlbumRow;
  const albumAccessible =
    a.owner_id === userId ||
    a.visibility === 'public' ||
    a.visibility === 'unlisted';
  if (!albumAccessible) return null;

  const { data: rows } = await supabase
    .from('album_tracks')
    .select('track_id, sort_order, tracks (*)')
    .eq('album_id', a.id)
    .order('sort_order', { ascending: true });

  const tracks: DashboardTrack[] = [];
  for (const r of (rows ?? []) as AlbumTrackJoinRow[]) {
    const joined = joinTrack(r.tracks);
    const id = joined?.id ?? r.track_id;
    const allowed = await getCatalogTrackIfAccessible(supabase, userId, id);
    if (!allowed) continue;
    tracks.push(
      catalogRowToDashboardTrack(allowed, false, {
        is_single: false,
        album_title: a.title,
      }),
    );
  }

  return { album: a, tracks };
}

async function withCoverOriginalLink(
  supabase: ReturnType<typeof createServiceCatalog>,
  userId: string | null,
  allowed: CatalogTrackRow,
  base: DashboardTrack,
): Promise<DashboardTrack> {
  if (!allowed.is_cover || !allowed.original_track_id?.trim()) {
    return base;
  }
  const originalId = allowed.original_track_id.trim();
  const original = userId
    ? await getCatalogTrackIfAccessible(supabase, userId, originalId)
    : await getCatalogTrackIfAnonymousAccessible(supabase, originalId);
  if (!original) {
    return { ...base, is_cover: true as const };
  }
  return {
    ...base,
    is_cover: true as const,
    original_genesis_slug: original.slug,
    original_genesis_title: original.title,
  };
}

/**
 * Resolve a track for /music/tracks/[slug]: catalog (access-checked) then static config.
 */
export async function resolveTrackForMusicPage(
  userId: string | null,
  slug: string,
): Promise<DashboardTrack | null> {
  const decoded = decodeURIComponent(slug);

  if (userId) {
    const supabase = createServiceCatalog();
    const { data: candidates, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('slug', decoded)
      .order('featured', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('title', { ascending: true });

    if (!error && candidates?.length) {
      for (const row of candidates as CatalogTrackRow[]) {
        const allowed = await getCatalogTrackIfAccessible(
          supabase,
          userId,
          row.id,
        );
        if (allowed) {
          const linked = await isTrackLinkedToAnyAlbum(supabase, allowed.id);
          const albumTitles = linked
            ? await fetchPrimaryAlbumTitleByTrackIds(supabase, [allowed.id])
            : new Map<string, string>();
          const albumTitle = albumTitles.get(allowed.id);
          const base = catalogRowToDashboardTrack(allowed, false, {
            is_single: !linked,
            ...(linked && albumTitle ? { album_title: albumTitle } : {}),
          });
          return withCoverOriginalLink(supabase, userId, allowed, base);
        }
      }
    }
  } else {
    const supabase = createServiceCatalog();
    const { data: candidates, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('slug', decoded)
      .order('featured', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('title', { ascending: true });

    if (!error && candidates?.length) {
      for (const row of candidates as CatalogTrackRow[]) {
        const allowed = await getCatalogTrackIfAnonymousAccessible(
          supabase,
          row.id,
        );
        if (allowed) {
          const linked = await isTrackLinkedToAnyAlbum(supabase, allowed.id);
          const albumTitles = linked
            ? await fetchPrimaryAlbumTitleByTrackIds(supabase, [allowed.id])
            : new Map<string, string>();
          const albumTitle = albumTitles.get(allowed.id);
          const base = catalogRowToDashboardTrack(allowed, false, {
            is_single: !linked,
            ...(linked && albumTitle ? { album_title: albumTitle } : {}),
          });
          return withCoverOriginalLink(supabase, null, allowed, base);
        }
      }
    }
  }

  const { getDashboardTrackBySlug } = await import('@/lib/dashboard-tracks');
  return getDashboardTrackBySlug(decoded) ?? null;
}
