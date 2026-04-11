import 'server-only';

import { SignJWT, importPKCS8 } from 'jose';

import { getSiteUrl } from '@/lib/site-url';

/**
 * `window.location.origin` from the client — must be in the JWT `origin` claim or Apple MusicKit
 * authorize often fails with a generic “network” error. Vercel’s `VERCEL_URL` alone can miss
 * the custom domain users actually open.
 */
export function parsePageOriginHeader(value: string | null): string | undefined {
  const t = value?.trim();
  if (!t) return undefined;
  try {
    const u = new URL(t);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return undefined;
    if (
      u.protocol === 'http:' &&
      u.hostname !== 'localhost' &&
      u.hostname !== '127.0.0.1'
    ) {
      return undefined;
    }
    return u.origin.replace(/\/$/, '');
  } catch {
    return undefined;
  }
}

/**
 * Origins allowed to use the developer token in the browser (must match `Origin` on Apple requests).
 * @see https://developer.apple.com/documentation/applemusicapi/generating-developer-tokens (claim `origin`)
 */
export function buildAppleMusicJwtOrigins(
  pageOriginFromClient?: string | null,
): string[] {
  const raw = process.env.APPLE_MUSIC_JWT_ORIGINS?.trim();
  const parts =
    raw && raw.length > 0
      ? raw.split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean)
      : [getSiteUrl().replace(/\/$/, '')];

  const set = new Set<string>();
  const page = pageOriginFromClient?.trim().replace(/\/$/, '');
  if (page) set.add(page);
  for (const p of parts) set.add(p);

  if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT?.trim() || '3000';
    set.add(`http://localhost:${port}`);
    set.add(`http://127.0.0.1:${port}`);
  }

  return Array.from(set);
}

/**
 * Apple’s `.p8` is PEM PKCS#8. Env files often break it: outer quotes, literal `\n`, CRLF, or a single long line.
 */
function normalizePem(raw: string): string {
  let t = raw.trim().replace(/^\uFEFF/, '');
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim();
  }
  t = t.replace(/\\n/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  if (!t.includes('BEGIN') && !t.includes('END')) {
    try {
      t = Buffer.from(t.replace(/\s/g, ''), 'base64').toString('utf8');
    } catch {
      /* keep original */
    }
  }

  return t.trim();
}

export function isAppleMusicDeveloperCredentialsConfigured(): boolean {
  return Boolean(
    process.env.APPLE_MUSIC_TEAM_ID?.trim() &&
      process.env.APPLE_MUSIC_KEY_ID?.trim() &&
      process.env.APPLE_MUSIC_PRIVATE_KEY?.trim(),
  );
}

/**
 * JWT for MusicKit on the web and Apple Music API (server-side catalog calls).
 * @see https://developer.apple.com/documentation/applemusicapi/getting_keys_and_creating_tokens
 */
export async function createAppleMusicDeveloperToken(
  pageOriginFromClient?: string | null,
): Promise<string> {
  const teamId = process.env.APPLE_MUSIC_TEAM_ID?.trim();
  const keyId = process.env.APPLE_MUSIC_KEY_ID?.trim();
  const pem = process.env.APPLE_MUSIC_PRIVATE_KEY?.trim();
  if (!teamId || !keyId || !pem) {
    throw new Error(
      'Missing APPLE_MUSIC_TEAM_ID, APPLE_MUSIC_KEY_ID, or APPLE_MUSIC_PRIVATE_KEY',
    );
  }

  const key = await importPKCS8(normalizePem(pem), 'ES256');
  const ttlRaw = process.env.APPLE_MUSIC_DEV_TOKEN_TTL?.trim();
  /** Apple allows up to ~6 months; keep ours shorter unless overridden (jose duration string). */
  const ttl = ttlRaw && ttlRaw.length > 0 ? ttlRaw : '12h';

  const omitOrigin = process.env.APPLE_MUSIC_JWT_OMIT_ORIGIN === 'true';
  const origins = buildAppleMusicJwtOrigins(pageOriginFromClient);

  const payload = omitOrigin ? {} : { origin: origins };

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(key);
}
