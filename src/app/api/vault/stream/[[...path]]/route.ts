import { auth } from '@clerk/nextjs/server';
import { type NextRequest, NextResponse } from 'next/server';

import { vaultPathAllowedForAnonymous } from '@/lib/catalog-track-access';
import { rewriteHlsManifest } from '@/lib/hls-manifest-rewrite';
import { createServiceCatalog } from '@/lib/supabase-catalog';
import { getVaultSignedUrl } from '@/lib/vault';

function isUnsafePath(p: string): boolean {
  return p.includes('..') || p.startsWith('/');
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path: segments } = await context.params;
  if (!segments?.length) {
    return new NextResponse('Not found', { status: 404 });
  }

  const objectPath = segments
    .map((seg) => {
      try {
        return decodeURIComponent(seg);
      } catch {
        return seg;
      }
    })
    .join('/');
  if (isUnsafePath(objectPath)) {
    return new NextResponse('Invalid path', { status: 400 });
  }

  const { userId } = await auth();
  if (!userId) {
    const supabase = createServiceCatalog();
    const allowed = await vaultPathAllowedForAnonymous(supabase, objectPath);
    if (!allowed) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }

  let signedUrl: string;
  try {
    signedUrl = await getVaultSignedUrl(objectPath);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to sign URL';
    return new NextResponse(msg, { status: 403 });
  }

  const origin = request.nextUrl.origin;
  const lower = objectPath.toLowerCase();

  if (lower.endsWith('.m3u8')) {
    const upstream = await fetch(signedUrl);
    if (!upstream.ok) {
      return new NextResponse('Failed to fetch manifest', {
        status: upstream.status === 404 ? 404 : 502,
      });
    }
    const text = await upstream.text();
    const rewritten = rewriteHlsManifest(text, objectPath, origin);
    return new NextResponse(rewritten, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'private, max-age=30',
      },
    });
  }

  return NextResponse.redirect(signedUrl, 302);
}
