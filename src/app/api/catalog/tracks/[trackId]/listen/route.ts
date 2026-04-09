import { randomUUID } from 'crypto';

import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  ANON_LISTENER_COOKIE,
  isLikelyUuid,
  setAnonListenerCookie,
} from '@/lib/anonymous-listener-cookie';
import {
  getCatalogTrackIfAccessible,
  getCatalogTrackIfAnonymousAccessible,
} from '@/lib/catalog-track-access';
import { createServiceCatalog } from '@/lib/supabase-catalog';
import { isCatalogTrackId } from '@/lib/catalog-track-id';

export const runtime = 'nodejs';

const MAX_INCREMENT_PER_REQUEST = 45;

type Body = { increment_seconds?: unknown };

/**
 * Records cumulative listen time while the player is actually playing (client sends wall-clock deltas).
 * Signed-in: `api.user_track_listen_progress`. Signed-out: `api.anonymous_listen_progress` + `viyac_anon` cookie.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ trackId: string }> },
) {
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
    const supabase = createServiceCatalog();
    const { userId } = await auth();

    if (userId) {
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
        durationSec != null
          ? Math.min(increment, Math.max(0, durationSec - prev))
          : increment;
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
            hint: 'Apply migrations for api schema if tables are missing.',
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        listened_seconds_total: next,
        track_id: trackId,
      });
    }

    const track = await getCatalogTrackIfAnonymousAccessible(supabase, trackId);
    if (!track) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const cookieStore = await cookies();
    const rawListener = cookieStore.get(ANON_LISTENER_COOKIE)?.value;
    const listenerId: string =
      rawListener && isLikelyUuid(rawListener) ? rawListener : randomUUID();

    const durationSec =
      track.duration_ms != null && track.duration_ms > 0
        ? track.duration_ms / 1000 + 0.5
        : null;

    const { data: existing, error: readError } = await supabase
      .from('anonymous_listen_progress')
      .select('listened_seconds_total')
      .eq('listener_id', listenerId)
      .eq('track_id', trackId)
      .maybeSingle();

    if (readError) {
      console.error('[catalog/tracks/listen anonymous]', readError);
      return NextResponse.json({ error: readError.message }, { status: 500 });
    }

    const prev = Number(existing?.listened_seconds_total ?? 0);
    const cappedInc =
      durationSec != null
        ? Math.min(increment, Math.max(0, durationSec - prev))
        : increment;
    const next = prev + cappedInc;

    const { error: upsertError } = await supabase
      .from('anonymous_listen_progress')
      .upsert(
        {
          listener_id: listenerId,
          track_id: trackId,
          listened_seconds_total: next,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'listener_id,track_id' },
      );

    if (upsertError) {
      console.error('[catalog/tracks/listen anonymous]', upsertError);
      return NextResponse.json(
        {
          error: upsertError.message,
          hint: 'Apply migration 20260410000000_anonymous_visible_and_listen.sql if the table is missing.',
        },
        { status: 500 },
      );
    }

    const res = NextResponse.json({
      listened_seconds_total: next,
      track_id: trackId,
      anonymous: true as const,
    });
    setAnonListenerCookie(res, listenerId);
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
