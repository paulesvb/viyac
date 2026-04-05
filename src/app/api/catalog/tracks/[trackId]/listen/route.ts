import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { getCatalogTrackIfAccessible } from '@/lib/catalog-track-access';
import { createServiceSupabase } from '@/lib/supabase-service';
import { isCatalogTrackId } from '@/lib/catalog-track-id';

export const runtime = 'nodejs';

const MAX_INCREMENT_PER_REQUEST = 45;

type Body = { increment_seconds?: unknown };

/**
 * Records cumulative listen time while the player is actually playing (client sends wall-clock deltas).
 */
export async function POST(
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

  const raw = body.increment_seconds;
  const increment =
    typeof raw === 'number' && Number.isFinite(raw)
      ? Math.max(0, Math.min(MAX_INCREMENT_PER_REQUEST, raw))
      : typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))
        ? Math.max(0, Math.min(MAX_INCREMENT_PER_REQUEST, Number(raw)))
        : 0;

  if (increment <= 0) {
    return NextResponse.json({ error: 'increment_seconds required' }, { status: 400 });
  }

  try {
    const supabase = createServiceSupabase();
    const track = await getCatalogTrackIfAccessible(supabase, userId, trackId);
    if (!track) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const durationSec =
      track.duration_ms != null && track.duration_ms > 0
        ? track.duration_ms / 1000 + 0.5
        : null;

    const { data: existing, error: readError } = await supabase
      .from('user_track_listen_progress')
      .select('listened_seconds_total')
      .eq('user_id', userId)
      .eq('track_id', trackId)
      .maybeSingle();

    if (readError) {
      console.error('[catalog/tracks/listen]', readError);
      return NextResponse.json({ error: readError.message }, { status: 500 });
    }

    const prev = Number(existing?.listened_seconds_total ?? 0);
    const cappedInc =
      durationSec != null ? Math.min(increment, Math.max(0, durationSec - prev)) : increment;
    const next = prev + cappedInc;

    const { error: upsertError } = await supabase
      .from('user_track_listen_progress')
      .upsert(
        {
          user_id: userId,
          track_id: trackId,
          listened_seconds_total: next,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,track_id' },
      );

    if (upsertError) {
      console.error('[catalog/tracks/listen]', upsertError);
      return NextResponse.json(
        {
          error: upsertError.message,
          hint: 'Apply migration 20260402200000_track_listen_and_ratings.sql if the table is missing.',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      listened_seconds_total: next,
      track_id: trackId,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
