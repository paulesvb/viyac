import { auth, currentUser } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';

import DashboardPageClient from '@/app/dashboard/dashboard-page-client';
import {
  fetchAnonymousHomeTracksFromCatalog,
  fetchDashboardAlbumsFromCatalog,
  fetchDashboardTracksFromCatalog,
  fetchPublicDashboardAlbumsFromCatalog,
} from '@/lib/catalog-from-supabase';
import { getDashboardTracks } from '@/lib/dashboard-tracks';
import {
  HOME_INTRO_DISMISSED_COOKIE,
  isHomeIntroDismissedInCookie,
} from '@/lib/home-intro-cookie';
import { createServiceSupabase } from '@/lib/supabase-service';

export async function HomePageContent() {
  const { userId } = await auth();
  let showIntroCard = false;
  const albums =
    userId != null
      ? await fetchDashboardAlbumsFromCatalog(userId)
      : await fetchPublicDashboardAlbumsFromCatalog();
  let tracks =
    userId != null
      ? await fetchDashboardTracksFromCatalog(userId)
      : await fetchAnonymousHomeTracksFromCatalog();
  if (tracks.length === 0) {
    tracks = getDashboardTracks();
  }

  if (userId) {
    const supabase = createServiceSupabase();
    const { data } = await supabase
      .from('profiles')
      .select('home_intro_dismissed')
      .eq('id', userId)
      .maybeSingle();
    showIntroCard = data?.home_intro_dismissed !== true;
  } else {
    const jar = await cookies();
    showIntroCard = !isHomeIntroDismissedInCookie(
      jar.get(HOME_INTRO_DISMISSED_COOKIE)?.value,
    );
  }

  const userFirstName = userId ? (await currentUser())?.firstName ?? null : null;

  return (
    <DashboardPageClient
      tracks={tracks}
      albums={albums}
      showIntroCard={showIntroCard}
      isSignedIn={userId != null}
      userFirstName={userFirstName}
    />
  );
}
