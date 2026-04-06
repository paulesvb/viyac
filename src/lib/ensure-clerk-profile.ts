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

/**
 * Ensures a `profiles` row exists after sign-in. Webhooks often miss local dev or misconfigured endpoints.
 * Safe to call on every protected page load (idempotent upsert).
 */
export async function ensureClerkProfileSynced(): Promise<void> {
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
  );

  if (error) {
    console.error('[ensure-clerk-profile]', error.message);
  }
}
