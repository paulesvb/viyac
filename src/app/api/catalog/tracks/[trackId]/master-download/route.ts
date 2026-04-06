import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { createServiceCatalog } from '@/lib/supabase-catalog';
import { signMasterDownloadObject } from '@/lib/master-download';
import { isCatalogTrackId } from '@/lib/catalog-track-id';

export const runtime = 'nodejs';

/**
 * Returns a short-lived signed URL for the track master WAV.
 * Requires a row in `api.track_master_purchases` for this user and track,
 * or the user must own the track (artist testing / self-service).
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ trackId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { trackId } = await ctx.params;
  if (!isCatalogTrackId(trackId)) {
    return NextResponse.json({ error: 'Invalid track id' }, { status: 400 });
  }

  try {
    const supabase = createServiceCatalog();

    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('id, owner_id, master_download_url')
      .eq('id', trackId)
      .maybeSingle();

    if (trackError || !track) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const objectKey = (track.master_download_url as string | null)?.trim();
    if (!objectKey) {
      return NextResponse.json(
        { error: 'No master file configured for this track.' },
        { status: 404 },
      );
    }

    const isOwner = (track.owner_id as string) === userId;

    if (!isOwner) {
      const { data: purchase, error: purchaseError } = await supabase
        .from('track_master_purchases')
        .select('user_id')
        .eq('user_id', userId)
        .eq('track_id', trackId)
        .maybeSingle();

      if (purchaseError) {
        console.error('[master-download]', purchaseError);
        return NextResponse.json({ error: purchaseError.message }, { status: 500 });
      }
      if (!purchase) {
        return NextResponse.json(
          { error: 'Master download requires a completed purchase.' },
          { status: 403 },
        );
      }
    }

    const { signedUrl, expiresIn } = await signMasterDownloadObject(objectKey);

    const { data: countAfter, error: countError } = await supabase.rpc(
      'increment_track_master_download',
      { p_track_id: trackId },
    );

    if (countError) {
      console.error('[master-download] increment counter', countError);
    }

    return NextResponse.json({
      signedUrl,
      expiresIn,
      ...(typeof countAfter === 'number'
        ? { master_download_count: countAfter }
        : {}),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    const status = /Invalid|Missing/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
