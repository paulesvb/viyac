import { auth } from '@clerk/nextjs/server';
import {
  fetchDashboardAlbumsFromCatalog,
  fetchDashboardTracksFromCatalog,
} from '@/lib/catalog-from-supabase';
import { getDashboardTracks } from '@/lib/dashboard-tracks';
import DashboardPageClient from '@/app/dashboard/dashboard-page-client';

export default async function HomePage() {
  const { userId } = await auth();
  const albums =
    userId != null
      ? await fetchDashboardAlbumsFromCatalog(userId)
      : [];
  let tracks =
    userId != null
      ? await fetchDashboardTracksFromCatalog(userId)
      : [];
  if (tracks.length === 0) {
    tracks = getDashboardTracks();
  }

  return <DashboardPageClient tracks={tracks} albums={albums} />;
}
