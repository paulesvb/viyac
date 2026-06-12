import { auth } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';

import { AlbumPageClient } from '@/components/AlbumPageClient';
import { HomeBackLink } from '@/components/HomeBackLink';
import { getAccessibleAlbumWithTracksBySlug } from '@/lib/catalog-from-supabase';
import { getCollectionPath, getLoginPath } from '@/lib/ui-language';
import { resolvePublicAssetsUrl } from '@/lib/storage';

type Props = {
  slug: string;
  pathnameForRedirect: string;
};

export async function AlbumPageContent({
  slug,
  pathnameForRedirect,
}: Props) {
  const { userId } = await auth();
  if (!userId) {
    redirect(
      `${getLoginPath(pathnameForRedirect)}?redirect_url=${encodeURIComponent(
        getCollectionPath(pathnameForRedirect, slug),
      )}`,
    );
  }

  const data = await getAccessibleAlbumWithTracksBySlug(userId, slug);
  if (!data) notFound();

  const { album, tracks } = data;
  let coverUrl: string | null = null;
  if (album.cover_image_path) {
    try {
      coverUrl = resolvePublicAssetsUrl(album.cover_image_path);
    } catch {
      coverUrl = null;
    }
  }

  return (
    <div className="min-w-0 w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <HomeBackLink />

        <AlbumPageClient
          albumTitle={album.title}
          albumSlug={album.slug}
          coverUrl={coverUrl}
          tracks={tracks}
        />
      </div>
    </div>
  );
}
