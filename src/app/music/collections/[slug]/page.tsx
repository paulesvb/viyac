import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';

import { AlbumPageContent } from '@/app/music/collections/album-page-content';
import { getAccessibleAlbumWithTracksBySlug } from '@/lib/catalog-from-supabase';
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
  if (!userId) return { title: fallback };
  const data = await getAccessibleAlbumWithTracksBySlug(userId, slug);
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
