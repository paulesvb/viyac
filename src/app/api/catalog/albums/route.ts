import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { createServiceCatalog } from '@/lib/supabase-catalog';
import type { CatalogAlbumRow } from '@/lib/catalog-types';

export const runtime = 'nodejs';

/**
 * Lists albums you own plus any public/unlisted albums (for a future multi-artist feed).
 * Uses the service role after Clerk checks — RLS is bypassed; access is enforced here.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceCatalog();
    const { data, error } = await supabase
      .from('albums')
      .select('*')
      .or(`owner_id.eq.${userId},visibility.eq.public,visibility.eq.unlisted`)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[catalog/albums]', error);
      return NextResponse.json(
        {
          error: error.message,
          hint: 'Run the music catalog migration in Supabase (schema `api`) if tables are missing.',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ albums: (data ?? []) as CatalogAlbumRow[] });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
