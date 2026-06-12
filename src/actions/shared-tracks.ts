'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { createServiceCatalog } from '@/lib/supabase-catalog';
import { isCatalogTrackId } from '@/lib/catalog-track-id';
import { isPlatformAdmin } from '@/lib/admin-access';

export async function hideSharedTrack(
  trackId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: 'You must be signed in.' };
  if (!isCatalogTrackId(trackId)) return { ok: false, error: 'Invalid track.' };

  const supabase = createServiceCatalog();
  const { data: grant, error: grantError } = await supabase
    .from('catalog_track_viewers')
    .select('track_id')
    .eq('track_id', trackId)
    .eq('viewer_user_id', userId)
    .maybeSingle();

  if (grantError) {
    console.error('[hideSharedTrack] grant lookup', grantError);
    return { ok: false, error: grantError.message };
  }
  if (!grant) {
    return { ok: false, error: 'Track is not shared with you.' };
  }

  const { error } = await supabase.from('catalog_track_viewer_hides').upsert(
    {
      track_id: trackId,
      viewer_user_id: userId,
    },
    { onConflict: 'track_id,viewer_user_id' },
  );

  if (error) {
    console.error('[hideSharedTrack]', error);
    return { ok: false, error: error.message };
  }

  revalidatePath('/tracks/shared');
  revalidatePath('/home');
  return { ok: true };
}

export async function deleteTrackViewerHide(
  trackId: string,
  viewerUserId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: 'You must be signed in.' };
  if (!isPlatformAdmin(userId)) return { ok: false, error: 'Not allowed.' };
  if (!isCatalogTrackId(trackId) || !viewerUserId.trim()) {
    return { ok: false, error: 'Invalid request.' };
  }

  const supabase = createServiceCatalog();
  const { error } = await supabase
    .from('catalog_track_viewer_hides')
    .delete()
    .eq('track_id', trackId)
    .eq('viewer_user_id', viewerUserId.trim());

  if (error) {
    console.error('[deleteTrackViewerHide]', error);
    return { ok: false, error: error.message };
  }

  revalidatePath('/admin/tracks/shared');
  revalidatePath('/tracks/shared');
  revalidatePath('/home');
  return { ok: true };
}
