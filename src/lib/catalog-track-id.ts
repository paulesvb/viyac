const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCatalogTrackId(id: string | undefined | null): id is string {
  return typeof id === 'string' && UUID_RE.test(id.trim());
}

/** Same UUID shape as catalog track ids (`api.albums.id`). */
export function isCatalogAlbumId(id: string | undefined | null): id is string {
  return isCatalogTrackId(id);
}
