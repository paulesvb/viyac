import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import {
  createAppleMusicDeveloperToken,
  isAppleMusicDeveloperCredentialsConfigured,
  parsePageOriginHeader,
  buildAppleMusicJwtOrigins,
} from '@/lib/apple-music-developer-token';
import { userHasAppleLinked } from '@/lib/apple-music-user';

export const runtime = 'nodejs';

/**
 * Short-lived MusicKit developer token (JWT). Private key stays on the server.
 * Requires Clerk session. Set APPLE_MUSIC_REQUIRE_APPLE_ID=true to allow only users who linked Apple.
 */
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (process.env.APPLE_MUSIC_REQUIRE_APPLE_ID === 'true') {
    const user = await currentUser();
    if (!userHasAppleLinked(user)) {
      return NextResponse.json(
        { error: 'Apple account required for this feature' },
        { status: 403 },
      );
    }
  }

  if (!isAppleMusicDeveloperCredentialsConfigured()) {
    return NextResponse.json(
      {
        error:
          'Apple Music is not configured (set APPLE_MUSIC_TEAM_ID, APPLE_MUSIC_KEY_ID, APPLE_MUSIC_PRIVATE_KEY)',
      },
      { status: 503 },
    );
  }

  try {
    const pageOrigin = parsePageOriginHeader(
      request.headers.get('x-page-origin'),
    );
    const token = await createAppleMusicDeveloperToken(pageOrigin);
    return NextResponse.json({
      token,
      origins: buildAppleMusicJwtOrigins(pageOrigin),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[api/apple-music/developer-token]', message, e);
    const body: { error: string; hint?: string } = {
      error: 'Failed to sign developer token',
    };
    if (process.env.NODE_ENV === 'development') {
      body.hint = message;
    }
    return NextResponse.json(body, { status: 500 });
  }
}
