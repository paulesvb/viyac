import { auth } from '@clerk/nextjs/server';
import { unstable_noStore as noStore } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

import {
  vaultObjectPathMatchesTrack,
  vaultPathAllowedForAnonymous,
  vaultPathAllowedForUser,
} from '@/lib/catalog-track-access';
import { getDashboardTracks } from '@/lib/dashboard-tracks';
import { rewriteHlsManifest } from '@/lib/hls-manifest-rewrite';
import { createServiceCatalog } from '@/lib/supabase-catalog';
import { getVaultSignedUrl } from '@/lib/vault';

/** Config/env fallback tracks (not in `api.tracks`) — any signed-in user may stream these paths. */
function dashboardStaticVaultAllows(objectPath: string): boolean {
  const o = objectPath.trim().replace(/^\/+/, '');
  if (!o) return false;
  for (const t of getDashboardTracks()) {
    const paths = [
      t.track_path,
      t.waveform_json_vault_path,
      t.vault_background_video_path,
    ].filter((p): p is string => Boolean(p?.trim()));
    for (const p of paths) {
      if (vaultObjectPathMatchesTrack(o, p)) return true;
    }
  }
  return false;
}

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
  const supabase = createServiceCatalog();

  if (userId) {
    const catalogOk = await vaultPathAllowedForUser(
      supabase,
      userId,
      objectPath,
    );
    const staticOk = dashboardStaticVaultAllows(objectPath);
    if (!catalogOk && !staticOk) {
      return new NextResponse('Forbidden', { status: 403 });
    }
  } else {
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
