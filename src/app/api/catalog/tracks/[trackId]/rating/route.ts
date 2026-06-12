import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getCatalogTrackIfAccessible } from '@/lib/catalog-track-access';
import {
  listenEligibleForRating,
  ratingListenThresholdSeconds,
} from '@/lib/rating-listen-policy';
import { createServiceCatalog } from '@/lib/supabase-catalog';
import { isCatalogTrackId } from '@/lib/catalog-track-id';

export const runtime = 'nodejs';

type Body = { rating?: unknown };

type CatalogClient = ReturnType<typeof createServiceCatalog>;

async function loadListenAndRating(
  supabase: CatalogClient,
  userId: string,
  trackId: string,
) {
  const [{ data: progress }, { data: ratingRow }] = await Promise.all([
    supabase
      .from('user_track_listen_progress')
      .select('listened_seconds_total')
      .eq('user_id', userId)
      .eq('track_id', trackId)
      .maybeSingle(),
    supabase
      .from('track_ratings')
      .select('rating')
      .eq('user_id', userId)
      .eq('track_id', trackId)
      .maybeSingle(),
  ]);

  const listened = Number(progress?.listened_seconds_total ?? 0);
  const rating =
    ratingRow && typeof ratingRow.rating === 'number' ? ratingRow.rating : null;

  return { listened, rating };
}

/** Personal rating + listen progress for gating. */
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
    const track = await getCatalogTrackIfAccessible(supabase, userId, trackId);
    if (!track) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { listened, rating } = await loadListenAndRating(
      supabase,
      userId,
      trackId,
    );
    const thresholdSeconds = ratingListenThresholdSeconds(track.duration_ms);
    const eligible = listenEligibleForRating(listened, track.duration_ms);

    return NextResponse.json({
      track_id: trackId,
      listened_seconds_total: listened,
      threshold_seconds: thresholdSeconds,
      eligible,
      rating,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Set or update the signed-in user’s personal rating (requires listen eligibility). */
export async function PUT(
  req: Request,
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

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const raw = body.rating;
  const rating =
    typeof raw === 'number' && Number.isInteger(raw)
      ? raw
      : typeof raw === 'string' && raw.trim() !== ''
        ? Number.parseInt(raw, 10)
        : NaN;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'rating must be 1–5' }, { status: 400 });
  }

  try {
    const supabase = createServiceCatalog();
    const track = await getCatalogTrackIfAccessible(supabase, userId, trackId);
    if (!track) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { listened } = await loadListenAndRating(supabase, userId, trackId);
    if (!listenEligibleForRating(listened, track.duration_ms)) {
      return NextResponse.json(
        {
          error: 'Listen longer before rating',
          listened_seconds_total: listened,
          threshold_seconds: ratingListenThresholdSeconds(track.duration_ms),
        },
        { status: 403 },
      );
    }

    const now = new Date().toISOString();
    const { error } = await supabase.from('track_ratings').upsert(
      {
        user_id: userId,
        track_id: trackId,
        rating,
        updated_at: now,
      },
      { onConflict: 'user_id,track_id' },
    );

    if (error) {
      console.error('[catalog/tracks/rating]', error);
      return NextResponse.json(
        {
          error: error.message,
          hint: 'Apply migration 20260402200000_track_listen_and_ratings.sql (schema `api`) if the table is missing.',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      track_id: trackId,
      rating,
      listened_seconds_total: listened,
      threshold_seconds: ratingListenThresholdSeconds(track.duration_ms),
      eligible: true,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
