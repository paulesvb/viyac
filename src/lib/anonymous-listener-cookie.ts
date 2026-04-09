import type { NextResponse } from 'next/server';

export const ANON_LISTENER_COOKIE = 'viyac_anon';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isLikelyUuid(s: string | undefined): boolean {
  return Boolean(s && UUID_RE.test(s));
}

export function setAnonListenerCookie(
  res: NextResponse,
  listenerId: string,
): void {
  res.cookies.set(ANON_LISTENER_COOKIE, listenerId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 400,
    secure: process.env.NODE_ENV === 'production',
  });
}
