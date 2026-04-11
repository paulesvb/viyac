/** Used by Edge middleware — keep Node-only APIs out of this file. */

function parsePlatformAdminUserIds(): Set<string> {
  const combined =
    process.env.ADMIN_CLERK_USER_IDS?.trim() ||
    process.env.ADMIN_CLERK_USER_ID?.trim() ||
    '';
  if (!combined) return new Set();
  return new Set(
    combined
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/** True when `ADMIN_CLERK_USER_ID` / `ADMIN_CLERK_USER_IDS` is set (non-empty). */
export function isPlatformAdminConfigured(): boolean {
  return parsePlatformAdminUserIds().size > 0;
}

/**
 * Only these Clerk user IDs may use `/admin` and publishing server actions.
 * Set `ADMIN_CLERK_USER_ID=user_xxx` or `ADMIN_CLERK_USER_IDS=id1,id2`.
 */
export function isPlatformAdmin(userId: string | null | undefined): boolean {
  if (!userId?.trim()) return false;
  const allowed = parsePlatformAdminUserIds();
  if (allowed.size === 0) return false;
  return allowed.has(userId.trim());
}
