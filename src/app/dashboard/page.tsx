import { auth } from '@clerk/nextjs/server';
import { fetchDashboardTracksFromCatalog } from '@/lib/catalog-from-supabase';
import { getDashboardTracks } from '@/lib/dashboard-tracks';
import DashboardPageClient from './dashboard-page-client';

export default async function DashboardPage() {
  const { userId } = await auth();
  let tracks =
    userId != null
      ? await fetchDashboardTracksFromCatalog(userId)
      : [];
  if (tracks.length === 0) {
    tracks = getDashboardTracks();
  }

  return <DashboardPageClient tracks={tracks} />;
}
