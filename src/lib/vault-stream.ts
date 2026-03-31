/**
 * Same-origin URL for HLS playback through `/api/vault/stream/...`.
 * The proxy rewrites manifests and redirects segments to signed Supabase URLs
 * so relative `.ts` requests are not blocked on private buckets.
 */
export function vaultStreamUrl(trackPath: string): string {
  const segments = trackPath.split('/').filter(Boolean);
  if (segments.length === 0) return '/api/vault/stream';
  return `/api/vault/stream/${segments.map(encodeURIComponent).join('/')}`;
}
