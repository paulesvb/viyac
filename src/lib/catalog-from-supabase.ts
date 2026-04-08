import 'server-only';

import { createServiceCatalog } from '@/lib/supabase-catalog';
import type { CatalogAlbumRow, CatalogTrackRow } from '@/lib/catalog-types';
import { getCatalogTrackIfAccessible } from '@/lib/catalog-track-access';
import type { DashboardTrack } from '@/lib/dashboard-track-types';

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
};

type AlbumTrackJoinRow = {
  track_id: string;
  sort_order: number;
  tracks: CatalogTrackRow | CatalogTrackRow[] | null;
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

/**
 * Tracks the signed-in user may play: owned, public/unlisted, or on a public/unlisted album.
 */
export async function listAccessibleCatalogTrackRows(
  userId: string,
): Promise<CatalogTrackRow[]> {
  const supabase = createServiceCatalog();

  const [{ data: owned }, { data: visible }, { data: atRows }] = await Promise.all([
    supabase.from('tracks').select('*').eq('owner_id', userId),
    supabase.from('tracks').select('*').in('visibility', ['public', 'unlisted']),
    supabase.from('album_tracks').select('track_id, albums ( visibility )'),
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
    ...((owned ?? []) as CatalogTrackRow[]),
    ...((visible ?? []) as CatalogTrackRow[]),
    ...viaAlbumTracks,
  ]) {
    map.set(t.id, t);
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.title.localeCompare(b.title);
  });
}

export function catalogRowToDashboardTrack(
  row: CatalogTrackRow,
  featured: boolean,
): DashboardTrack {
  return {
    slug: row.slug,
    title: row.title,
    track_path: row.track_path,
    featured,
    content_type: row.content_type === 'audio' ? 'audio' : 'video',
    description_en: row.description_en ?? undefined,
    description_es: row.description_es ?? undefined,
    provenance_type: row.provenance_type ?? undefined,
    waveform_json_path: row.waveform_json_path ?? undefined,
    waveform_json_vault_path: row.waveform_json_vault_path ?? undefined,
    vault_background_video_path: row.vault_background_video_path ?? undefined,
    thumbnail_url: row.thumbnail_path ?? undefined,
    bg_image_path: row.thumbnail_path ?? undefined,
    lock_screen_art_path: row.lock_screen_art_path ?? row.thumbnail_path ?? undefined,
    catalog_track_id: row.id,
  };
}

/** Catalog-backed list for the dashboard (empty if none or error). */
export async function fetchDashboardTracksFromCatalog(
  userId: string,
): Promise<DashboardTrack[]> {
  try {
    const rows = await listAccessibleCatalogTrackRows(userId);
    if (rows.length === 0) return [];
    const hasFeatured = rows.some((r) => r.featured);
    return rows.map((r, i) =>
      catalogRowToDashboardTrack(r, hasFeatured ? r.featured : i === 0),
    );
  } catch (e) {
    console.error('[fetchDashboardTracksFromCatalog]', e);
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

      out.push({
        id: a.id,
        slug: a.slug,
        title: a.title,
        cover_image_path: a.cover_image_path ?? undefined,
        track_count: count,
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
    tracks.push(catalogRowToDashboardTrack(allowed, false));
  }

  return { album: a, tracks };
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
      .eq('slug', decoded);

    if (!error && candidates?.length) {
      for (const row of candidates as CatalogTrackRow[]) {
        const allowed = await getCatalogTrackIfAccessible(
          supabase,
          userId,
          row.id,
        );
        if (allowed) {
          return catalogRowToDashboardTrack(allowed, false);
        }
      }
    }
  }

  const { getDashboardTrackBySlug } = await import('@/lib/dashboard-tracks');
  return getDashboardTrackBySlug(decoded) ?? null;
}
