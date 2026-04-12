'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

import { isPlatformAdmin } from '@/lib/admin-access';
import { createServiceCatalog } from '@/lib/supabase-catalog';
import { isCatalogAlbumId, isCatalogTrackId } from '@/lib/catalog-track-id';
import type { CatalogTrackRow } from '@/lib/catalog-types';
import { resolveCoverOriginalForDb } from '@/lib/track-cover-original';

function trimOrEmpty(s: string | undefined): string {
  return s?.trim() ?? '';
}

function nullIfEmpty(s: string): string | null {
  const t = s.trim();
  return t ? t : null;
}

export type TrackPublishingInput = {
  visibility: CatalogTrackRow['visibility'];
  featured: boolean;
  anonymous_visible: boolean;
  show_in_home_more_tracks: boolean;
  is_cover: boolean;
  /** Empty when not a cover; must reference a Genesis non-cover when `is_cover`. */
  original_track_id: string;
  vault_background_video_path: string;
  thumbnail_path: string;
  lock_screen_art_path: string;
  lyrics: string;
  lyrics_by: string;
  album_assignment: 'single' | 'album';
  /** Required when `album_assignment` is `album`. */
  album_id: string;
};

export async function updateTrackPublishingFields(
  trackId: string,
  slug: string,
  input: TrackPublishingInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: 'You must be signed in.' };
  }
  if (!isPlatformAdmin(userId)) {
    return { ok: false, error: 'Not allowed.' };
  }
  if (!isCatalogTrackId(trackId)) {
    return { ok: false, error: 'Invalid track id.' };
  }

  const supabase = createServiceCatalog();
  const { data: row, error: fetchError } = await supabase
    .from('tracks')
    .select('id, slug')
    .eq('id', trackId)
    .maybeSingle();

  if (fetchError || !row) {
    return { ok: false, error: 'Track not found.' };
  }

  if ((row as { slug: string }).slug !== slug) {
    return { ok: false, error: 'Slug mismatch; refresh the page.' };
  }

  const coverResolved = await resolveCoverOriginalForDb(supabase, {
    isCover: Boolean(input.is_cover),
    originalTrackIdRaw: input.original_track_id,
    disallowSameAsTrackId: trackId,
  });
  if (!coverResolved.ok) {
    return { ok: false, error: coverResolved.error };
  }

  const { error: updateError } = await supabase
    .from('tracks')
    .update({
      visibility: input.visibility,
      featured: input.featured,
      anonymous_visible: input.anonymous_visible,
      show_in_home_more_tracks: input.show_in_home_more_tracks,
      is_cover: coverResolved.isCover,
      original_track_id: coverResolved.originalTrackId,
      vault_background_video_path: nullIfEmpty(
        trimOrEmpty(input.vault_background_video_path),
      ),
      thumbnail_path: nullIfEmpty(trimOrEmpty(input.thumbnail_path)),
      lock_screen_art_path: nullIfEmpty(trimOrEmpty(input.lock_screen_art_path)),
      lyrics: nullIfEmpty(trimOrEmpty(input.lyrics)),
      lyrics_by: nullIfEmpty(trimOrEmpty(input.lyrics_by)),
      updated_at: new Date().toISOString(),
    })
    .eq('id', trackId);

  if (updateError) {
    console.error('[updateTrackPublishingFields]', updateError);
    return { ok: false, error: updateError.message };
  }

  const albumMode = input.album_assignment === 'album' ? 'album' : 'single';
  const albumIdForLink = trimOrEmpty(input.album_id);
  let newAlbumSlug: string | null = null;

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
    newAlbumSlug = (albumRow as { slug: string }).slug.trim() || null;
  }

  const { data: existingLinks } = await supabase
    .from('album_tracks')
    .select('album_id')
    .eq('track_id', trackId);
  const oldAlbumIds = [
    ...new Set((existingLinks ?? []).map((r) => r.album_id as string)),
  ];

  async function albumSlugsForIds(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const { data: albumRows } = await supabase
      .from('albums')
      .select('slug')
      .in('id', ids);
    return [
      ...new Set(
        (albumRows ?? []).map((r) => (r as { slug: string }).slug.trim()),
      ),
    ].filter(Boolean);
  }

  const slugsBefore = await albumSlugsForIds(oldAlbumIds);

  const unchangedAlbumPlacement =
    albumMode === 'single' && oldAlbumIds.length === 0;
  const unchangedStillOnSameAlbum =
    albumMode === 'album' &&
    isCatalogAlbumId(albumIdForLink) &&
    oldAlbumIds.length === 1 &&
    oldAlbumIds[0] === albumIdForLink;

  if (!unchangedAlbumPlacement && !unchangedStillOnSameAlbum) {
    const { error: delErr } = await supabase
      .from('album_tracks')
      .delete()
      .eq('track_id', trackId);
    if (delErr) {
      console.error('[updateTrackPublishingFields] album_tracks delete', delErr);
      return { ok: false, error: delErr.message };
    }

    if (albumMode === 'album' && isCatalogAlbumId(albumIdForLink)) {
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
        console.error('[updateTrackPublishingFields] album_tracks insert', linkErr);
        for (const s of slugsBefore) {
          revalidatePath(`/music/albums/${encodeURIComponent(s)}`);
        }
        revalidatePath('/admin/albums');
        return {
          ok: false,
          error: `Could not attach track to album: ${linkErr.message}`,
        };
      }
    }
  }

  const slugsToRevalidate = new Set([
    ...slugsBefore,
    ...(newAlbumSlug ? [newAlbumSlug] : []),
  ]);
  for (const s of slugsToRevalidate) {
    revalidatePath(`/music/albums/${encodeURIComponent(s)}`);
  }
  revalidatePath('/admin/albums');

  revalidatePath('/admin/tracks');
  revalidatePath(`/admin/tracks/${trackId}`);
  revalidatePath('/home');
  revalidatePath(`/music/tracks/${encodeURIComponent(slug)}`);
  revalidatePath('/');

  return { ok: true };
}
