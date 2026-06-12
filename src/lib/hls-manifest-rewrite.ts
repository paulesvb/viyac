import { VAULT_BUCKET } from '@/lib/storage';

/**
 * Rewrites HLS manifest lines so relative URIs point at our vault stream proxy.
 */

function proxyUrlForPath(objectPath: string, origin: string): string {
  const segments = objectPath.split('/').filter(Boolean).map(encodeURIComponent);
  return `${origin}/api/vault/stream/${segments.join('/')}`;
}

/**
 * Packaged HLS sometimes lists absolute Supabase URLs (`/object/sign/vault/...`) without a
 * `token` query param. Those always 400. Rewrite to our same-origin proxy using the object key.
 */
function tryVaultObjectKeyFromSupabaseStorageUrl(href: string): string | null {
  try {
    const u = new URL(href.trim());
    const re = new RegExp(
      `^/storage/v1/object/(?:sign|public)/${VAULT_BUCKET}/(.+)$`,
      'i',
    );
    const m = u.pathname.match(re);
    if (!m?.[1]) return null;
    return decodeURIComponent(m[1].replace(/\+/g, ' '));
  } catch {
    return null;
  }
}

/**
 * Manifests sometimes contain absolute `/api/vault/stream/...` URLs baked in with another
 * deployment’s origin (e.g. `http://localhost:3000/...` after local testing). Hls then
 * requests the wrong host in production. Normalize to the current request origin.
 */
function rewriteAbsoluteVaultStreamUrlToCurrentOrigin(
  href: string,
  origin: string,
): string | null {
  try {
    const u = new URL(href.trim());
    if (!u.pathname.startsWith('/api/vault/stream')) return null;
    const base = origin.replace(/\/$/, '');
    return `${base}${u.pathname}${u.search}${u.hash}`;
  } catch {
    return null;
  }
}

function rewriteHttpsRefToProxyIfNeeded(href: string, origin: string): string | null {
  const t = href.trim();
  if (!t.startsWith('http://') && !t.startsWith('https://')) return null;
  const samePathOtherHost = rewriteAbsoluteVaultStreamUrlToCurrentOrigin(t, origin);
  if (samePathOtherHost) return samePathOtherHost;
  const key = tryVaultObjectKeyFromSupabaseStorageUrl(t);
  if (!key) return null;
  return proxyUrlForPath(key, origin);
}

/** Resolve a reference relative to the manifest's storage path (e.g. `folder/master.m3u8`). */
export function resolveHlsRef(manifestPath: string, ref: string): string {
  const trimmed = ref.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const dir = manifestPath.includes('/')
    ? manifestPath.replace(/\/[^/]+$/, '')
    : '';
  const base = `https://hls.invalid/${dir ? `${dir}/` : ''}`;
  const resolved = new URL(trimmed, base);
  return resolved.pathname.replace(/^\//, '');
}

export function rewriteHlsManifest(
  body: string,
  manifestPath: string,
  origin: string,
): string {
  const lines = body.split(/\r?\n/);
  const out = lines.map((line) => rewriteHlsLine(line, manifestPath, origin));
  return out.join('\n');
}

function rewriteHlsLine(
  line: string,
  manifestPath: string,
  origin: string,
): string {
  let result = line.replace(/URI="([^"]+)"/g, (full, uri: string) => {
    const proxied = rewriteHttpsRefToProxyIfNeeded(uri, origin);
    if (proxied) return `URI="${proxied}"`;
    if (uri.startsWith('http://') || uri.startsWith('https://')) return full;
    const resolved = resolveHlsRef(manifestPath, uri);
    return `URI="${proxyUrlForPath(resolved, origin)}"`;
  });
  result = result.replace(/URI='([^']+)'/g, (full, uri: string) => {
    const proxied = rewriteHttpsRefToProxyIfNeeded(uri, origin);
    if (proxied) return `URI='${proxied}'`;
    if (uri.startsWith('http://') || uri.startsWith('https://')) return full;
    const resolved = resolveHlsRef(manifestPath, uri);
    return `URI='${proxyUrlForPath(resolved, origin)}'`;
  });

  const t = result.trim();
  if (t.startsWith('#') || t === '') return result;

  const proxiedLine = rewriteHttpsRefToProxyIfNeeded(t, origin);
  if (proxiedLine) return proxiedLine;

  if (t.startsWith('http://') || t.startsWith('https://')) return result;

  const resolved = resolveHlsRef(manifestPath, t);
  return proxyUrlForPath(resolved, origin);
}
