import 'server-only';

import type { User } from '@clerk/backend';
import { clerkClient } from '@clerk/nextjs/server';

export type AdminUserOption = {
  id: string;
  label: string;
  email: string | null;
};

function formatClerkUser(u: User): AdminUserOption {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  const primaryId = u.primaryEmailAddressId;
  const email =
    u.emailAddresses.find((e) => e.id === primaryId)?.emailAddress ??
    u.emailAddresses[0]?.emailAddress ??
    null;
  return {
    id: u.id,
    label: name || email || u.id,
    email,
  };
}

/**
 * Clerk user directory for admin grant pickers (requires Clerk secret key).
 */
export async function listUsersForAdminPicker(
  query?: string | null,
  limit = 100,
): Promise<AdminUserOption[]> {
  try {
    const client = await clerkClient();
    const res = await client.users.getUserList({
      limit,
      orderBy: '-created_at',
      ...(query?.trim() ? { query: query.trim() } : {}),
    });
    return res.data.map(formatClerkUser);
  } catch (e) {
    console.error('[listUsersForAdminPicker]', e);
    return [];
  }
}
