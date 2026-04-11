import 'server-only';

import type { User } from '@clerk/nextjs/server';

/** Clerk Apple SSO — used when APPLE_MUSIC_REQUIRE_APPLE_ID=true. */
export function userHasAppleLinked(user: User | null | undefined): boolean {
  const accounts = user?.externalAccounts;
  if (!accounts?.length) return false;
  return accounts.some((a) => {
    const p = a.provider?.toLowerCase() ?? '';
    return p === 'oauth_apple' || p === 'apple' || p.endsWith('_apple');
  });
}
