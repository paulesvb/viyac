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

/** File in the same vault folder as an HLS manifest (e.g. `folder/waveform.json`). */
export function coLocatedVaultFile(
  trackPath: string,
  filename: string,
): string | null {
  const track = trackPath.trim();
  if (!track) return null;
  const i = track.lastIndexOf('/');
  if (i < 0) return null;
  return `${track.slice(0, i + 1)}${filename}`;
}

/**
 * Prefer vault assets beside `trackPath` when catalog stores stale paths in another folder
 * (e.g. HLS at `tracks/viyac/rocket/` but bg video still `rocket-57/video-loop.mp4`).
 */
export function resolveVaultSiblingPath(
  trackPath: string,
  configuredPath: string | undefined,
  defaultFilename: string,
): string | null {
  const track = trackPath.trim();
  if (!track) return null;
  const configured = configuredPath?.trim();
  if (configured) {
    const trackDir = track.includes('/')
      ? track.slice(0, track.lastIndexOf('/') + 1)
      : '';
    const siblingDir = configured.includes('/')
      ? configured.slice(0, configured.lastIndexOf('/') + 1)
      : '';
    if (trackDir && siblingDir && trackDir !== siblingDir) {
      return coLocatedVaultFile(track, defaultFilename);
    }
    return configured;
  }
  return coLocatedVaultFile(track, defaultFilename);
}
