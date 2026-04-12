import 'server-only';

import { currentUser } from '@clerk/nextjs/server';

import { syncClerkProfileToSupabase } from '@/lib/clerk-profile-sync';

function displayNameFromUser(
  user: NonNullable<Awaited<ReturnType<typeof currentUser>>>,
  email: string,
): string {
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  if (fullName) return fullName;
  if (user.username) return user.username;
  return email.split('@')[0] ?? user.id;
}

export type EnsureClerkProfileOptions = {
  /** Set profiles.is_dev when syncing from local `next dev` (see `/sync`). */
  markDevProfile?: boolean;
};

/**
 * Upserts `profiles` from the signed-in Clerk user (session).
 * Production uses the Clerk webhook; local dev uses `/sync` after sign-in.
 */
export async function ensureClerkProfileSynced(
  options?: EnsureClerkProfileOptions,
): Promise<void> {
  const user = await currentUser();
  if (!user) return;

  const primary = user.emailAddresses?.find(
    (e) => e.id === user.primaryEmailAddressId,
  );
  const email =
    primary?.emailAddress ?? user.emailAddresses?.[0]?.emailAddress;
  if (!email) {
    console.warn('[ensure-clerk-profile] No email on Clerk user', user.id);
    return;
  }

  const externalAccounts = user.externalAccounts?.map((a) => ({
    provider: a.provider,
  }));

  const { error } = await syncClerkProfileToSupabase(
    {
      id: user.id,
      email,
      displayName: displayNameFromUser(user, email),
      externalAccounts,
    },
    'user.updated',
    { isDevProfile: options?.markDevProfile === true },
  );

  if (error) {
    console.error('[ensure-clerk-profile]', error.message);
  }
}
