import { auth } from '@clerk/nextjs/server';
import { Navbar } from '@/components/Navbar';
import { isPlatformAdmin } from '@/lib/admin-access';
import {
  fetchCatalogTrackFavoritesCount,
  fetchSharedTracksCountForViewer,
} from '@/lib/catalog-from-supabase';

export async function NavbarWrapper() {
  const { userId } = await auth();
  const isAdmin = isPlatformAdmin(userId);
  const favoritesCount = userId
    ? await fetchCatalogTrackFavoritesCount(userId)
    : 0;
  const sharedTracksCount =
    userId && !isAdmin ? await fetchSharedTracksCountForViewer(userId) : 0;
  return (
    <Navbar
      showAdminLink={isAdmin}
      favoritesCount={favoritesCount}
      sharedTracksCount={sharedTracksCount}
    />
  );
}
