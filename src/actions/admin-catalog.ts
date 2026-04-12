'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

import { isPlatformAdmin } from '@/lib/admin-access';
import { createServiceCatalog } from '@/lib/supabase-catalog';
import { isCatalogTrackId } from '@/lib/catalog-track-id';
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
      updated_at: new Date().toISOString(),
    })
    .eq('id', trackId);

  if (updateError) {
    console.error('[updateTrackPublishingFields]', updateError);
    return { ok: false, error: updateError.message };
  }

  revalidatePath('/admin/tracks');
  revalidatePath(`/admin/tracks/${trackId}`);
  revalidatePath('/home');
  revalidatePath(`/music/tracks/${encodeURIComponent(slug)}`);
  revalidatePath('/');

  return { ok: true };
}
