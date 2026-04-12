'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

import { isPlatformAdmin } from '@/lib/admin-access';
import { createServiceCatalog } from '@/lib/supabase-catalog';
import { isCatalogTrackId } from '@/lib/catalog-track-id';

export async function setCatalogTrackViewerGrant(
  trackId: string,
  viewerUserId: string,
  granted: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: 'You must be signed in.' };
  }
  if (!isPlatformAdmin(userId)) {
    return { ok: false, error: 'Not allowed.' };
  }
  if (!isCatalogTrackId(trackId) || !viewerUserId.trim()) {
    return { ok: false, error: 'Invalid request.' };
  }

  const supabase = createServiceCatalog();
  const { data: row, error: fetchError } = await supabase
    .from('tracks')
    .select('slug, owner_id')
    .eq('id', trackId)
    .maybeSingle();

  if (fetchError || !row) {
    return { ok: false, error: 'Track not found.' };
  }

  const ownerId = (row as { owner_id: string | null }).owner_id;
  const slug = (row as { slug: string }).slug;
  if (ownerId && viewerUserId.trim() === ownerId) {
    return { ok: true };
  }

  if (granted) {
    const { error } = await supabase.from('catalog_track_viewers').upsert(
      {
        track_id: trackId,
        viewer_user_id: viewerUserId.trim(),
      },
      { onConflict: 'track_id,viewer_user_id' },
    );
    if (error) {
      console.error('[setCatalogTrackViewerGrant] upsert', error);
      return { ok: false, error: error.message };
    }
  } else {
    const { error } = await supabase
      .from('catalog_track_viewers')
      .delete()
      .eq('track_id', trackId)
      .eq('viewer_user_id', viewerUserId.trim());
    if (error) {
      console.error('[setCatalogTrackViewerGrant] delete', error);
      return { ok: false, error: error.message };
    }
  }

  revalidatePath(`/admin/tracks/${trackId}/viewers`);
  revalidatePath(`/admin/tracks/${trackId}`);
  revalidatePath('/admin/tracks');
  revalidatePath('/home');
  revalidatePath(`/music/tracks/${encodeURIComponent(slug)}`);

  return { ok: true };
}
