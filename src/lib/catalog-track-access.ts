import { isPlatformAdmin } from '@/lib/admin-access';
import type { createServiceCatalog } from '@/lib/supabase-catalog';
import type { CatalogTrackRow } from '@/lib/catalog-types';
import { catalogTrackHasViewerGrant } from '@/lib/track-viewer-grants';

type CatalogServiceClient = ReturnType<typeof createServiceCatalog>;

/**
 * Returns the track row if `userId` may access it for playback/catalog (matches tracks RLS idea).
 * Pass `createServiceCatalog()` (service role, `api` schema).
 */
export async function getCatalogTrackIfAccessible(
  supabase: CatalogServiceClient,
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
  if (isPlatformAdmin(userId)) return row;
  if (await catalogTrackHasViewerGrant(supabase, trackId, userId)) return row;
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

/**
 * Vault proxy requests include the manifest path and segment paths under the same folder.
 * Also treats files in the same parent directory as related (waveform / bg video / HLS siblings).
 */
export function vaultObjectPathMatchesTrack(
  objectPath: string,
  trackPath: string,
): boolean {
  const norm = (s: string) => s.trim().replace(/^\/+/, '');
  const o = norm(objectPath);
  const c = norm(trackPath);
  if (!o || !c) return false;
  if (o === c) return true;

  const parentPrefix = (p: string): string | null => {
    const i = p.lastIndexOf('/');
    if (i < 0) return null;
    return p.slice(0, i + 1);
  };

  const po = parentPrefix(o);
  const pc = parentPrefix(c);
  if (po !== null && pc !== null && po === pc) return true;
  if (pc !== null && o.startsWith(pc)) return true;
  if (po !== null && c.startsWith(po)) return true;
  return false;
}

/**
 * Signed-out playback: track must opt in and be otherwise world-readable (direct or via public/unlisted album).
 */
export async function getCatalogTrackIfAnonymousAccessible(
  supabase: CatalogServiceClient,
  trackId: string,
): Promise<CatalogTrackRow | null> {
  const { data: track, error: trackError } = await supabase
    .from('tracks')
    .select('*')
    .eq('id', trackId)
    .maybeSingle();

  if (trackError || !track) return null;

  const row = track as CatalogTrackRow;
  if (!row.anonymous_visible) return null;

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

/**
 * Catalog tracks that signed-out users may see on the public landing page / stream via vault.
 * Same rules as {@link getCatalogTrackIfAnonymousAccessible} per row, batched for listing.
 */
export async function listAnonymousAccessibleCatalogTrackRows(
  supabase: CatalogServiceClient,
): Promise<CatalogTrackRow[]> {
  const { data: rows, error } = await supabase
    .from('tracks')
    .select('*')
    .eq('anonymous_visible', true);

  if (error) {
    console.error('[listAnonymousAccessibleCatalogTrackRows]', error);
    return [];
  }
  const list = (rows ?? []) as CatalogTrackRow[];
  if (list.length === 0) return [];

  const trackIds = list.map((r) => r.id);
  const { data: atRows, error: atError } = await supabase
    .from('album_tracks')
    .select('track_id, album_id')
    .in('track_id', trackIds);

  if (atError) {
    console.error('[listAnonymousAccessibleCatalogTrackRows] album_tracks', atError);
    return [];
  }

  const albumIds = [
    ...new Set((atRows ?? []).map((x) => x.album_id as string)),
  ];

  const { data: albums, error: albumsError } =
    albumIds.length > 0
      ? await supabase.from('albums').select('id,visibility').in('id', albumIds)
      : { data: [], error: null };

  if (albumsError) {
    console.error('[listAnonymousAccessibleCatalogTrackRows] albums', albumsError);
    return [];
  }

  const publicAlbumIds = new Set(
    (albums ?? [])
      .filter((a) => a.visibility === 'public' || a.visibility === 'unlisted')
      .map((a) => a.id as string),
  );

  const trackToAlbums = new Map<string, string[]>();
  for (const r of atRows ?? []) {
    const tid = r.track_id as string;
    const cur = trackToAlbums.get(tid) ?? [];
    cur.push(r.album_id as string);
    trackToAlbums.set(tid, cur);
  }

  const allowed = list.filter((row) =>
    trackIsWorldReadableForAnonymous(row, trackToAlbums, publicAlbumIds),
  );

  return allowed.sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.title.localeCompare(b.title);
  });
}

function vaultBundleContainsPath(
  objectPath: string,
  row: CatalogTrackRow,
): boolean {
  const paths = [
    row.track_path,
    row.waveform_json_vault_path,
    row.vault_background_video_path,
  ].filter((p): p is string => Boolean(p?.trim()));
  for (const p of paths) {
    if (vaultObjectPathMatchesTrack(objectPath, p)) return true;
  }
  return false;
}

function trackIsWorldReadableForAnonymous(
  row: CatalogTrackRow,
  trackToAlbums: Map<string, string[]>,
  publicAlbumIds: Set<string>,
): boolean {
  if (row.visibility === 'public' || row.visibility === 'unlisted') return true;
  const aids = trackToAlbums.get(row.id) ?? [];
  return aids.some((id) => publicAlbumIds.has(id));
}

/**
 * True if `objectPath` is part of an anonymously streamable track’s vault assets (HLS, waveform, bg video).
 * Uses a small fixed number of DB round-trips per request (important for every HLS segment).
 */
export async function vaultPathAllowedForAnonymous(
  supabase: CatalogServiceClient,
  objectPath: string,
): Promise<boolean> {
  const { data: rows, error: tracksError } = await supabase
    .from('tracks')
    .select('*')
    .eq('anonymous_visible', true);

  if (tracksError) {
    console.error('[vaultPathAllowedForAnonymous] tracks', tracksError);
    return false;
  }

  const candidates = (rows ?? []).filter((raw) =>
    vaultBundleContainsPath(objectPath, raw as CatalogTrackRow),
  );
  if (candidates.length === 0) return false;

  const trackIds = candidates.map((r) => (r as CatalogTrackRow).id);

  const { data: atRows, error: atError } = await supabase
    .from('album_tracks')
    .select('track_id, album_id')
    .in('track_id', trackIds);

  if (atError) {
    console.error('[vaultPathAllowedForAnonymous] album_tracks', atError);
    return false;
  }

  const albumIds = [
    ...new Set((atRows ?? []).map((x) => x.album_id as string)),
  ];

  const { data: albums, error: albumsError } =
    albumIds.length > 0
      ? await supabase.from('albums').select('id,visibility').in('id', albumIds)
      : { data: [], error: null };

  if (albumsError) {
    console.error('[vaultPathAllowedForAnonymous] albums', albumsError);
    return false;
  }

  const publicAlbumIds = new Set(
    (albums ?? [])
      .filter((a) => a.visibility === 'public' || a.visibility === 'unlisted')
      .map((a) => a.id as string),
  );

  const trackToAlbums = new Map<string, string[]>();
  for (const r of atRows ?? []) {
    const tid = r.track_id as string;
    const list = trackToAlbums.get(tid) ?? [];
    list.push(r.album_id as string);
    trackToAlbums.set(tid, list);
  }

  for (const raw of candidates) {
    const row = raw as CatalogTrackRow;
    if (
      trackIsWorldReadableForAnonymous(row, trackToAlbums, publicAlbumIds)
    ) {
      return true;
    }
  }
  return false;
}
