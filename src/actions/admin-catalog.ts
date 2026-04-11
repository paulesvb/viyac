'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

import { isPlatformAdmin } from '@/lib/admin-access';
import { createServiceCatalog } from '@/lib/supabase-catalog';
import { isCatalogTrackId } from '@/lib/catalog-track-id';
import type { CatalogTrackRow } from '@/lib/catalog-types';

export type TrackPublishingInput = {
  visibility: CatalogTrackRow['visibility'];
  featured: boolean;
  anonymous_visible: boolean;
  show_in_home_more_tracks: boolean;
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

  const { error: updateError } = await supabase
    .from('tracks')
    .update({
      visibility: input.visibility,
      featured: input.featured,
      anonymous_visible: input.anonymous_visible,
      show_in_home_more_tracks: input.show_in_home_more_tracks,
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
