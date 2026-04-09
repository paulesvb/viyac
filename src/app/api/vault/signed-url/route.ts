import { auth } from '@clerk/nextjs/server';
import { type NextRequest, NextResponse } from 'next/server';

import { vaultPathAllowedForAnonymous } from '@/lib/catalog-track-access';
import { createServiceCatalog } from '@/lib/supabase-catalog';
import { getVaultSignedUrl } from '@/lib/vault';

const EXPIRES_SECONDS = 60 * 60 * 2;

function isUnsafePath(p: string): boolean {
  return p.includes('..') || p.startsWith('/');
}

/**
 * Returns a time-limited signed URL for a private `vault` object.
 * Query: `path` — object key (e.g. `rocket-57/waveform.json`).
 */
export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path')?.trim();
  if (!path || isUnsafePath(path)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const { userId } = await auth();
  if (!userId) {
    const supabase = createServiceCatalog();
    const allowed = await vaultPathAllowedForAnonymous(supabase, path);
    if (!allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const signedUrl = await getVaultSignedUrl(path);
    return NextResponse.json({
      signedUrl,
      expiresIn: EXPIRES_SECONDS,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to sign URL';
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
