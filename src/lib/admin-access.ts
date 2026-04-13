/** Used by server actions, RSC, and the Navbar client (see `NEXT_PUBLIC_*` note below). */

function splitCsvIds(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Clerk user IDs allowed as platform admins.
 * - Server: reads `ADMIN_CLERK_USER_ID` / `ADMIN_CLERK_USER_IDS` and optional
 *   `NEXT_PUBLIC_ADMIN_CLERK_USER_ID` / `NEXT_PUBLIC_ADMIN_CLERK_USER_IDS`.
 * - Client bundle: only `NEXT_PUBLIC_*` values are inlined; private `ADMIN_*`
 *   is omitted there, so set the `NEXT_PUBLIC_` copy **or** rely on the server
 *   prop from `NavbarWrapper` (with `noStore()` so it is not cached as false).
 */
function parsePlatformAdminUserIds(): Set<string> {
  const ids = new Set<string>();
  for (const raw of [
    process.env.ADMIN_CLERK_USER_IDS,
    process.env.ADMIN_CLERK_USER_ID,
    process.env.NEXT_PUBLIC_ADMIN_CLERK_USER_IDS,
    process.env.NEXT_PUBLIC_ADMIN_CLERK_USER_ID,
  ]) {
    for (const id of splitCsvIds(raw)) ids.add(id);
  }
  return ids;
}

/** True when any admin allowlist env var is set (non-empty). */
export function isPlatformAdminConfigured(): boolean {
  return parsePlatformAdminUserIds().size > 0;
}

/**
 * Only these Clerk user IDs may use `/admin` and publishing server actions.
 * Prefer `ADMIN_CLERK_USER_ID` / `ADMIN_CLERK_USER_IDS` on the server; duplicate
 * ids in `NEXT_PUBLIC_ADMIN_CLERK_USER_*` if the Admin nav link must resolve in
 * the client bundle (see module comment above).
 */
export function isPlatformAdmin(userId: string | null | undefined): boolean {
  if (!userId?.trim()) return false;
  const allowed = parsePlatformAdminUserIds();
  if (allowed.size === 0) return false;
  return allowed.has(userId.trim());
}
