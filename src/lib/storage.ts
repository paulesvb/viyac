/** Private bucket — HLS and other protected media; use signed URLs (see `getVaultSignedUrl`). */
export const VAULT_BUCKET = 'vault' as const;

/** Public bucket — art, thumbnails, marketing images; use `getPublicAssetUrl` or full public URLs. */
export const ASSETS_BUCKET = 'assets' as const;

/**
 * Public URL for an object in the `assets` bucket.
 * `objectPath` is the storage key without a leading slash (e.g. `covers/album.jpg`).
 */
export function getPublicAssetUrl(objectPath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  if (!base) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set.');
  }
  const path = objectPath.replace(/^\//, '');
  return `${base}/storage/v1/object/public/${ASSETS_BUCKET}/${path}`;
}

/**
 * Use a storage key (`covers/x.jpg`) or an already-built public object URL.
 * Full `http(s)://` strings are returned unchanged so env vars can paste Supabase public URLs.
 */
export function resolvePublicAssetsUrl(pathOrUrl: string): string {
  const t = pathOrUrl.trim();
  if (/^https?:\/\//i.test(t)) return t;
  return getPublicAssetUrl(t);
}
