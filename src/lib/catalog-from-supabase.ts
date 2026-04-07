import 'server-only';

import { createServiceCatalog } from '@/lib/supabase-catalog';
import type { CatalogTrackRow } from '@/lib/catalog-types';
import { getCatalogTrackIfAccessible } from '@/lib/catalog-track-access';
import type { DashboardTrack } from '@/lib/dashboard-track-types';

type AlbumsJoinRow = {
  track_id: string;
  albums: { visibility: string } | { visibility: string }[] | null;
};

function albumVisibility(
  albums: AlbumsJoinRow['albums'],
): string | undefined {
  if (!albums) return undefined;
  const row = Array.isArray(albums) ? albums[0] : albums;
  return row?.visibility;
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
    waveform_json_path: row.waveform_json_path ?? undefined,
    waveform_json_vault_path: row.waveform_json_vault_path ?? undefined,
    vault_background_video_path: row.vault_background_video_path ?? undefined,
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
    return rows.map((r, i) => catalogRowToDashboardTrack(r, i === 0));
  } catch (e) {
    console.error('[fetchDashboardTracksFromCatalog]', e);
    return [];
  }
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
