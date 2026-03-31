'use server';

import { getVaultSignedUrl } from '@/lib/vault';

export async function getVaultTrackSignedUrl(trackPath: string): Promise<string> {
  return getVaultSignedUrl(trackPath);
}
