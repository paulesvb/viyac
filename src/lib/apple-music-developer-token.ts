import 'server-only';

import { SignJWT, importPKCS8 } from 'jose';

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
export async function createAppleMusicDeveloperToken(): Promise<string> {
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

  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(key);
}
