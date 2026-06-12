import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import SharedTracksPageClient from '@/app/tracks/shared/shared-tracks-page-client';
import { fetchSharedTracksFromCatalog } from '@/lib/catalog-from-supabase';

export const metadata = {
  title: 'Shared Tracks | Viyac',
};

export default async function SharedTracksPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/login?redirect_url=%2Ftracks%2Fshared');
  }

  const tracks = await fetchSharedTracksFromCatalog(userId);
  return <SharedTracksPageClient tracks={tracks} />;
}
