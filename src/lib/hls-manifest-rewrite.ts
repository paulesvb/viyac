/**
 * Rewrites HLS manifest lines so relative URIs point at our vault stream proxy.
 */

function proxyUrlForPath(objectPath: string, origin: string): string {
  const segments = objectPath.split('/').filter(Boolean).map(encodeURIComponent);
  return `${origin}/api/vault/stream/${segments.join('/')}`;
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
    if (uri.startsWith('http://') || uri.startsWith('https://')) return full;
    const resolved = resolveHlsRef(manifestPath, uri);
    return `URI="${proxyUrlForPath(resolved, origin)}"`;
  });
  result = result.replace(/URI='([^']+)'/g, (full, uri: string) => {
    if (uri.startsWith('http://') || uri.startsWith('https://')) return full;
    const resolved = resolveHlsRef(manifestPath, uri);
    return `URI='${proxyUrlForPath(resolved, origin)}'`;
  });

  const t = result.trim();
  if (t.startsWith('#') || t === '') return result;

  if (t.startsWith('http://') || t.startsWith('https://')) return result;

  const resolved = resolveHlsRef(manifestPath, t);
  return proxyUrlForPath(resolved, origin);
}
