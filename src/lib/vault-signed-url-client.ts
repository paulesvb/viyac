/**
 * Client-side: fetch a short-lived signed URL for a `vault` object (requires signed-in session).
 */
export async function fetchVaultSignedUrl(objectPath: string): Promise<string> {
  const path = objectPath.replace(/^\//, '');
  const res = await fetch(
    `/api/vault/signed-url?path=${encodeURIComponent(path)}`,
    { credentials: 'same-origin' },
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Signed URL failed (${res.status})`);
  }
  const data = (await res.json()) as { signedUrl: string };
  if (!data.signedUrl) throw new Error('No signed URL in response');
  return data.signedUrl;
}
