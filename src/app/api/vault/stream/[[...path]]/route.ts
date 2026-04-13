import { auth } from '@clerk/nextjs/server';
import { unstable_noStore as noStore } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

import { rewriteHlsManifest } from '@/lib/hls-manifest-rewrite';
import { vaultReadAllowedForUser } from '@/lib/vault-read-authorization';
import { getVaultSignedUrl } from '@/lib/vault';

export const dynamic = 'force-dynamic';

/** Forward selected upstream headers so Range / partial content works for segments. */
function passthroughHeaders(upstream: Response): Headers {
  const out = new Headers();
  const copy = [
    'content-type',
    'content-length',
    'content-range',
    'accept-ranges',
    'etag',
    'last-modified',
  ] as const;
  for (const name of copy) {
    const v = upstream.headers.get(name);
    if (v) out.set(name, v);
  }
  out.set('Cache-Control', 'private, max-age=60');
  return out;
}

function isUnsafePath(p: string): boolean {
  return p.includes('..') || p.startsWith('/');
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  noStore();
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
    return new NextResponse('Unauthorized', { status: 401 });
  }

  if (!(await vaultReadAllowedForUser(userId, objectPath))) {
    return new NextResponse('Forbidden', { status: 403 });
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

  /**
   * Stream bytes through this origin instead of 302 to Supabase. Browsers and HLS
   * clients must hit URLs that include the signed `token` query param; redirects
   * can drop or mishandle long query strings → Supabase 400 ("token" missing).
   */
  const range = request.headers.get('Range');
  const upstream = await fetch(signedUrl, {
    redirect: 'follow',
    ...(range ? { headers: { Range: range } } : {}),
  });

  if (!upstream.ok || !upstream.body) {
    return new NextResponse(upstream.statusText || 'Upstream error', {
      status: upstream.status === 404 ? 404 : 502,
    });
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: passthroughHeaders(upstream),
  });
}
