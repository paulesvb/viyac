import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import FavoritesTracksPageClient from '@/app/tracks/favorites/favorites-tracks-page-client';
import { fetchFavoriteTracksFromCatalog } from '@/lib/catalog-from-supabase';

export const metadata = {
  title: 'Favorites | Viyac',
};

export default async function FavoritesTracksPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/login?redirect_url=%2Ftracks%2Ffavorites');
  }

  const tracks = await fetchFavoriteTracksFromCatalog(userId);
  return <FavoritesTracksPageClient tracks={tracks} />;
}
