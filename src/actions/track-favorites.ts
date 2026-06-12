'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { getCatalogTrackIfAccessible } from '@/lib/catalog-track-access';
import { isCatalogTrackId } from '@/lib/catalog-track-id';
import { createServiceCatalog } from '@/lib/supabase-catalog';

export async function getCatalogTrackFavoriteState(
  trackId: string,
): Promise<{ ok: true; favorited: boolean } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: 'Not signed in.' };
  if (!isCatalogTrackId(trackId)) return { ok: false, error: 'Invalid track.' };

  const supabase = createServiceCatalog();
  const { data, error } = await supabase
    .from('catalog_track_favorites')
    .select('track_id')
    .eq('user_id', userId)
    .eq('track_id', trackId)
    .maybeSingle();

  if (error) {
    console.error('[getCatalogTrackFavoriteState]', error);
    return { ok: false, error: error.message };
  }
  return { ok: true, favorited: data != null };
}

export async function setCatalogTrackFavorite(
  trackId: string,
  favorited: boolean,
): Promise<{ ok: true; favorited: boolean } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: 'You must be signed in.' };
  if (!isCatalogTrackId(trackId)) return { ok: false, error: 'Invalid track.' };

  const supabase = createServiceCatalog();

  if (!favorited) {
    const { error } = await supabase
      .from('catalog_track_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('track_id', trackId);
    if (error) {
      console.error('[setCatalogTrackFavorite] delete', error);
      return { ok: false, error: error.message };
    }
    revalidatePath('/');
    revalidatePath('/home');
    revalidatePath('/tracks/favorites');
    return { ok: true, favorited: false };
  }

  const allowed = await getCatalogTrackIfAccessible(supabase, userId, trackId);
  if (!allowed) {
    return { ok: false, error: 'You do not have access to this track.' };
  }

  const { error } = await supabase.from('catalog_track_favorites').upsert(
    { user_id: userId, track_id: trackId },
    { onConflict: 'user_id,track_id' },
  );
  if (error) {
    console.error('[setCatalogTrackFavorite] upsert', error);
    return { ok: false, error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/home');
  revalidatePath('/tracks/favorites');
  return { ok: true, favorited: true };
}
