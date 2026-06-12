'use server';

import { auth } from '@clerk/nextjs/server';

import { getVaultSignedUrl } from '@/lib/vault';

/** Prefer `/api/vault/signed-url` for client fetches; this action requires sign-in. */
export async function getVaultTrackSignedUrl(trackPath: string): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Unauthorized');
  }
  return getVaultSignedUrl(trackPath);
}
