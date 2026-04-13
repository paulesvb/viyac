'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

import { isPlatformAdmin } from '@/lib/admin-access';
import { slugifyCatalogTitle, withNumericSuffix } from '@/lib/catalog-slug';
import { isCatalogAlbumId } from '@/lib/catalog-track-id';
import {
  createServiceCatalog,
  formatCatalogPostgrestError,
} from '@/lib/supabase-catalog';
import type { CatalogAlbumRow, CatalogTrackRow } from '@/lib/catalog-types';
import { isMasteringProvenance } from '@/lib/catalog-types';
import { isProvenanceType } from '@/lib/provenance';
import { parseCommaSeparatedTags } from '@/lib/track-meta';
import { resolveCoverOriginalForDb } from '@/lib/track-cover-original';

function trimOrEmpty(s: string | undefined): string {
  return s?.trim() ?? '';
}

function nullIfEmpty(s: string): string | null {
  const t = s.trim();
  return t ? t : null;
}

/** Parses optional duration in whole seconds → milliseconds, or null. */
function parseDurationMsFromSeconds(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n > 86400 * 7) {
    return null;
  }
  return Math.round(n * 1000);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseReleaseDate(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (!ISO_DATE.test(t)) return null;
  const d = new Date(`${t}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return t;
}

async function uniqueTrackSlugForOwner(
  ownerId: string,
  base: string,
): Promise<string> {
  const supabase = createServiceCatalog();
  let candidate = base;
  for (let n = 0; n < 50; n += 1) {
    const { data } = await supabase
      .from('tracks')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('slug', candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = withNumericSuffix(base, n + 2);
  }
  return `${base}-${Date.now().toString(36)}`;
}

async function uniqueAlbumSlug(base: string): Promise<string> {
  const supabase = createServiceCatalog();
  let candidate = base;
  for (let n = 0; n < 50; n += 1) {
    const { data } = await supabase
      .from('albums')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = withNumericSuffix(base, n + 2);
  }
  return `${base}-${Date.now().toString(36)}`;
}

export type CreateTrackInput = {
  title: string;
  slug: string;
  track_path: string;
  content_type: CatalogTrackRow['content_type'];
  visibility: CatalogTrackRow['visibility'];
  provenance_type: CatalogTrackRow['provenance_type'] | '';
  composer: string;
  /** Whole seconds; empty → null `duration_ms`. */
  duration_seconds: string;
  waveform_json_vault_path: string;
  vault_background_video_path: string;
  thumbnail_path: string;
  lock_screen_art_path: string;
  description_en: string;
  description_es: string;
  /** Plain-text lyrics; `[SECTION]` on its own line starts a block. */
  lyrics: string;
  /** Optional lyrics writer credit. */
  lyrics_by: string;
  genres: string;
  instruments: string;
  is_instrumental: boolean;
  /** `YYYY-MM-DD` from `<input type="date">` or empty. */
  release_date: string;
  /** No `album_tracks` row when `single`. */
  album_assignment: 'single' | 'album';
  /** Required when `album_assignment` is `album`. */
  album_id: string;
  /** Empty = null in DB; otherwise STUDIO MASTERED or AI MASTERED. */
  mastering_provenance: string;
  /** Cover row: must pick a Genesis original (not itself a cover). */
  is_cover: boolean;
  original_track_id: string;
};

export async function createCatalogTrack(
  input: CreateTrackInput,
): Promise<{ ok: true; trackId: string } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: 'You must be signed in.' };
  }
  if (!isPlatformAdmin(userId)) {
    return { ok: false, error: 'Not allowed.' };
  }

  const title = trimOrEmpty(input.title);
  if (!title) {
    return { ok: false, error: 'Title is required.' };
  }

  const trackPath = trimOrEmpty(input.track_path);
  if (!trackPath) {
    return { ok: false, error: 'Vault track path is required (e.g. folder/master.m3u8).' };
  }

  const visibility = input.visibility;
  if (visibility !== 'private' && visibility !== 'public' && visibility !== 'unlisted') {
    return { ok: false, error: 'Invalid visibility.' };
  }

  const contentType = input.content_type === 'video' ? 'video' : 'audio';

  const slugBase = trimOrEmpty(input.slug)
    ? slugifyCatalogTitle(input.slug)
    : slugifyCatalogTitle(title);
  if (!slugBase) {
    return { ok: false, error: 'Could not derive a slug; enter a slug or title.' };
  }

  const slug = await uniqueTrackSlugForOwner(userId, slugBase);

  const provenance = trimOrEmpty(input.provenance_type ?? '');
  const provenance_type =
    provenance && isProvenanceType(provenance) ? provenance : null;

  const duration_ms = parseDurationMsFromSeconds(
    trimOrEmpty(input.duration_seconds),
  );
  if (trimOrEmpty(input.duration_seconds) && duration_ms == null) {
    return {
      ok: false,
      error: 'Duration must be a non-negative number of seconds (or leave empty).',
    };
  }

  const releaseDateRaw = trimOrEmpty(input.release_date);
  const release_date = parseReleaseDate(releaseDateRaw);
  if (releaseDateRaw && !release_date) {
    return {
      ok: false,
      error: 'Release date must be empty or a valid YYYY-MM-DD.',
    };
  }

  const genres = parseCommaSeparatedTags(trimOrEmpty(input.genres));
  const instruments = parseCommaSeparatedTags(trimOrEmpty(input.instruments));

  const masteringRaw = trimOrEmpty(input.mastering_provenance);
  const mastering_provenance =
    masteringRaw && isMasteringProvenance(masteringRaw) ? masteringRaw : null;
  if (masteringRaw && !mastering_provenance) {
    return {
      ok: false,
      error: 'Mastering provenance must be empty, STUDIO MASTERED, or AI MASTERED.',
    };
  }

  const albumMode = input.album_assignment === 'album' ? 'album' : 'single';
  const albumIdForLink = trimOrEmpty(input.album_id);
  let albumSlugForRevalidate: string | null = null;

  const supabase = createServiceCatalog();

  if (albumMode === 'album') {
    if (!isCatalogAlbumId(albumIdForLink)) {
      return { ok: false, error: 'Select an album from the list.' };
    }
    const { data: albumRow, error: albumLookupErr } = await supabase
      .from('albums')
      .select('id, slug')
      .eq('id', albumIdForLink)
      .maybeSingle();
    if (albumLookupErr || !albumRow) {
      return { ok: false, error: 'Album not found.' };
    }
    albumSlugForRevalidate = (albumRow as { slug: string }).slug;
  }

  const coverResolved = await resolveCoverOriginalForDb(supabase, {
    isCover: Boolean(input.is_cover),
    originalTrackIdRaw: input.original_track_id,
  });
  if (!coverResolved.ok) {
    return { ok: false, error: coverResolved.error };
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('tracks')
    .insert({
      slug,
      title,
      owner_id: userId,
      track_path: trackPath,
      content_type: contentType,
      visibility,
      provenance_type,
      is_cover: coverResolved.isCover,
      original_track_id: coverResolved.originalTrackId,
      composer: nullIfEmpty(trimOrEmpty(input.composer)),
      duration_ms,
      waveform_json_vault_path: nullIfEmpty(
        trimOrEmpty(input.waveform_json_vault_path),
      ),
      vault_background_video_path: nullIfEmpty(
        trimOrEmpty(input.vault_background_video_path),
      ),
      thumbnail_path: nullIfEmpty(trimOrEmpty(input.thumbnail_path)),
      lock_screen_art_path: nullIfEmpty(trimOrEmpty(input.lock_screen_art_path)),
      description_en: nullIfEmpty(trimOrEmpty(input.description_en)),
      description_es: nullIfEmpty(trimOrEmpty(input.description_es)),
      lyrics: nullIfEmpty(trimOrEmpty(input.lyrics)),
      lyrics_by: nullIfEmpty(trimOrEmpty(input.lyrics_by)),
      genres,
      instruments,
      is_instrumental: Boolean(input.is_instrumental),
      release_date,
      mastering_provenance,
      featured: false,
      anonymous_visible: false,
      sort_order: 0,
      updated_at: now,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[createCatalogTrack]', error);
    const msg = formatCatalogPostgrestError(error?.message, 'Insert failed.');
    if (msg.includes('profiles') || msg.includes('foreign key')) {
      return {
        ok: false,
        error:
          'No matching profile for your user. Sign in once so `profiles` exists, then try again.',
      };
    }
    return { ok: false, error: msg };
  }

  const trackId = data.id as string;

  if (albumMode === 'album') {
    const { data: lastLink } = await supabase
      .from('album_tracks')
      .select('sort_order')
      .eq('album_id', albumIdForLink)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSort =
      typeof lastLink?.sort_order === 'number' ? lastLink.sort_order + 1 : 0;

    const { error: linkErr } = await supabase.from('album_tracks').insert({
      album_id: albumIdForLink,
      track_id: trackId,
      sort_order: nextSort,
    });

    if (linkErr) {
      console.error('[createCatalogTrack] album_tracks', linkErr);
      await supabase.from('tracks').delete().eq('id', trackId);
      return {
        ok: false,
        error: `Could not attach track to album: ${formatCatalogPostgrestError(linkErr.message, 'Insert failed.')}`,
      };
    }

    if (albumSlugForRevalidate) {
      revalidatePath(
        `/music/albums/${encodeURIComponent(albumSlugForRevalidate)}`,
      );
    }
    revalidatePath('/admin/albums');
  }

  revalidatePath('/admin/tracks');
  revalidatePath('/home');
  revalidatePath('/');

  return { ok: true, trackId };
}

export type CreateAlbumInput = {
  title: string;
  slug: string;
  visibility: CatalogAlbumRow['visibility'];
  cover_image_path: string;
};

export async function createCatalogAlbum(
  input: CreateAlbumInput,
): Promise<{ ok: true; albumId: string } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: 'You must be signed in.' };
  }
  if (!isPlatformAdmin(userId)) {
    return { ok: false, error: 'Not allowed.' };
  }

  const title = trimOrEmpty(input.title);
  if (!title) {
    return { ok: false, error: 'Title is required.' };
  }

  const visibility = input.visibility;
  if (visibility !== 'private' && visibility !== 'public' && visibility !== 'unlisted') {
    return { ok: false, error: 'Invalid visibility.' };
  }

  const slugBase = trimOrEmpty(input.slug)
    ? slugifyCatalogTitle(input.slug)
    : slugifyCatalogTitle(title);
  if (!slugBase) {
    return { ok: false, error: 'Could not derive a slug.' };
  }

  const slug = await uniqueAlbumSlug(slugBase);
  const cover = trimOrEmpty(input.cover_image_path);

  const supabase = createServiceCatalog();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('albums')
    .insert({
      slug,
      title,
      owner_id: userId,
      visibility,
      sort_order: 0,
      updated_at: now,
      ...(cover ? { cover_image_path: cover } : {}),
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[createCatalogAlbum]', error);
    const msg = formatCatalogPostgrestError(error?.message, 'Insert failed.');
    if (msg.includes('profiles') || msg.includes('foreign key')) {
      return {
        ok: false,
        error:
          'No matching profile for your user. Sign in once so `profiles` exists, then try again.',
      };
    }
    return { ok: false, error: msg };
  }

  revalidatePath('/admin/albums');
  revalidatePath('/home');

  return { ok: true, albumId: data.id as string };
}
