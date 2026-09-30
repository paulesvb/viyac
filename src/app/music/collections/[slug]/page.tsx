import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';

import { AlbumPageContent } from '@/app/music/collections/album-page-content';
import {
  getAccessibleAlbumWithTracksBySlug,
  getPublicCollectionWithTracksBySlug,
} from '@/lib/catalog-from-supabase';
import { isAnonymousCollectionAccessEnabled } from '@/lib/feature-flags';
import { translate } from '@/lib/i18n';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { userId } = await auth();
  const fallback = translate('en', 'labelCollection');
  const data = userId
    ? await getAccessibleAlbumWithTracksBySlug(userId, slug)
    : (await isAnonymousCollectionAccessEnabled())
      ? await getPublicCollectionWithTracksBySlug(slug)
      : null;
  if (!data) return { title: fallback };
  const collections = translate('en', 'navCollections');
  return { title: `${data.album.title} | ${collections}` };
}

export default async function CollectionPage({ params }: PageProps) {
  const { slug } = await params;
  return (
    <AlbumPageContent
      slug={slug}
      pathnameForRedirect={`/music/collections/${slug}`}
    />
  );
}
