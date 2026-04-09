import { fetchAnonymousLandingTracks } from '@/lib/catalog-from-supabase';
import { getFeaturedDashboardTrackFromList } from '@/lib/dashboard-tracks';
import { LandingVaultPreview } from '@/components/LandingVaultPreview';

export default async function Home() {
  const tracks = await fetchAnonymousLandingTracks();
  const featured = getFeaturedDashboardTrackFromList(tracks);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-black">
      <div className="min-w-0 w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {featured ? <LandingVaultPreview track={featured} /> : null}
      </div>
    </div>
  );
}
