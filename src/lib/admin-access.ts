/** Server-only allowlist (`ADMIN_CLERK_USER_*`). Used in RSC, server actions, and `NavbarWrapper`. */

function splitCsvIds(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parsePlatformAdminUserIds(): Set<string> {
  const ids = new Set<string>();
  for (const raw of [
    process.env.ADMIN_CLERK_USER_IDS,
    process.env.ADMIN_CLERK_USER_ID,
  ]) {
    for (const id of splitCsvIds(raw)) ids.add(id);
  }
  return ids;
}

/** True when `ADMIN_CLERK_USER_ID` / `ADMIN_CLERK_USER_IDS` is set (non-empty). */
export function isPlatformAdminConfigured(): boolean {
  return parsePlatformAdminUserIds().size > 0;
}

/**
 * Only these Clerk user IDs may use `/admin`, publishing actions, and the Admin nav link.
 * Set `ADMIN_CLERK_USER_ID=user_xxx` or `ADMIN_CLERK_USER_IDS=id1,id2` (Vercel Production).
 */
export function isPlatformAdmin(userId: string | null | undefined): boolean {
  if (!userId?.trim()) return false;
  const allowed = parsePlatformAdminUserIds();
  if (allowed.size === 0) return false;
  return allowed.has(userId.trim());
}
