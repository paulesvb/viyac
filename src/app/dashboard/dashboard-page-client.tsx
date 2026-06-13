'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState, useTransition } from 'react';
import { dismissHomeIntroCard } from '@/actions/home-intro';
import { CatalogPlayer } from '@/components/CatalogPlayer';
import { CollectionCardBadge } from '@/components/CollectionCardBadge';
import { useBrowserLanguage } from '@/hooks/use-browser-language';
import { useTranslate } from '@/hooks/use-translate';
import { useAuthHref } from '@/hooks/use-auth-href';
import { useCollectionHref } from '@/hooks/use-collection-href';
import { useCampaignHref } from '@/hooks/use-campaign-href';
import { translateCollectionBadge } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardAlbum } from '@/lib/catalog-from-supabase';
import type { DashboardTrack } from '@/lib/dashboard-track-types';
import {
  getFeaturedDashboardTrackFromList,
  getHomeMoreTracksExcludingPlaying,
} from '@/lib/dashboard-tracks';
import { resolvePublicAssetsUrl } from '@/lib/storage';

type Props = {
  tracks: DashboardTrack[];
  albums: DashboardAlbum[];
  showIntroCard: boolean;
  isSignedIn: boolean;
  userFirstName?: string | null;
};

function getAlbumCoverUrl(album: DashboardAlbum): string | null {
  const source =
    album.cover_image_path?.trim() ||
    process.env.NEXT_PUBLIC_MEDIA_SESSION_ART_URL?.trim();
  if (!source) return null;
  try {
    return resolvePublicAssetsUrl(source);
  } catch {
    return null;
  }
}

export default function DashboardPageClient({
  tracks,
  albums,
  showIntroCard,
  isSignedIn,
  userFirstName,
}: Props) {
  const homeTracks = useMemo(
    () => getHomeMoreTracksExcludingPlaying(tracks, null),
    [tracks],
  );
  const catalogFeatured = useMemo(
    () => getFeaturedDashboardTrackFromList(homeTracks),
    [homeTracks],
  );
  const [loopHome, setLoopHome] = useState(false);
  const [introVisible, setIntroVisible] = useState(showIntroCard);
  const [dismissingIntro, startDismissingIntro] = useTransition();

  const dismissIntro = useCallback(() => {
    startDismissingIntro(async () => {
      const result = await dismissHomeIntroCard();
      if (result.ok) setIntroVisible(false);
    });
  }, []);

  const collectionHref = useCollectionHref();
  const { signupHref } = useAuthHref();
  const t = useTranslate();
  const lang = useBrowserLanguage();
  const { homeHref, aboutHref } = useCampaignHref();
  const homeTitle = t('navHome');

  return (
    <div className="min-w-0 w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6 sm:space-y-8">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {homeTitle}
        </h1>
        {!isSignedIn ? (
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <Link href={aboutHref}>{t('navBehindViyac')}</Link>
          </Button>
        ) : null}
      </header>

      {introVisible ? (
        isSignedIn ? (
          <Card className="border-cyan-500/25 bg-card/95">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">
                {t('introWelcome')}
                {userFirstName ? `, ${userFirstName}` : ''}.
              </CardTitle>
              <CardDescription>{t('introPathsLead')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <span className="font-medium text-foreground">
                    {t('badgeGenesis')}
                  </span>
                  : {t('introGenesisDesc')}
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    {t('badgeHybrid')}
                  </span>
                  : {t('introHybridDesc')}
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    {t('badgeEcho')}
                  </span>
                  : {t('introEchoDesc')}
                </li>
              </ul>
              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={dismissIntro}
                  disabled={dismissingIntro}
                >
                  {dismissingIntro ? t('ctaSaving') : t('ctaDismissPermanently')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-cyan-500/25 bg-card/95">
            <CardHeader>
              <CardTitle className="text-base uppercase tracking-wide sm:text-lg">
                {t('introAnonymousTitle')}
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                {t('introAnonymousBody')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <Button variant="brand" size="sm" asChild className="shrink-0">
                  <Link
                    href={signupHref(homeHref)}
                  >
                    {t('ctaAccessFullCatalog')}
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={dismissIntro}
                  disabled={dismissingIntro}
                  className="shrink-0"
                >
                  {dismissingIntro ? t('ctaSaving') : t('ctaDismissPermanently')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      ) : null}

      {catalogFeatured ? (
        <CatalogPlayer
          tracks={homeTracks}
          defaultTrack={catalogFeatured}
          queueEnabled={homeTracks.length > 1}
          gateAutoplayUntilPick
          loop={loopHome}
          onLoopChange={setLoopHome}
          showTransportControls
          headingIdle={t('badgeFeatured')}
          headingPlaying={t('badgeNowPlaying')}
          listTracks={homeTracks}
          listSectionTitle={t('sectionMoreFeaturedTracks')}
          listSectionId="more-featured-tracks-heading"
        />
      ) : null}

      {homeTracks.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No tracks yet</CardTitle>
            <CardDescription>
              Seed the Supabase catalog ({' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                npm run seed:catalog
              </code>
              ), add entries in{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                src/config/dashboard-tracks.ts
              </code>
              , or set a vault path for a single preview track.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Example in{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                .env.local
              </code>
              :
            </p>
            <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs text-foreground">
              {`NEXT_PUBLIC_DASHBOARD_VAULT_TRACK_PATH=your-folder/master.m3u8
# Optional — public assets bucket path for the blurred background
# NEXT_PUBLIC_DASHBOARD_VAULT_BG_PATH=backgrounds/dashboard.jpg`}
            </pre>
          </CardContent>
        </Card>
      ) : null}

      {albums.length > 0 ? (
        <section className="space-y-4" aria-labelledby="collections-heading">
          <h2
            id="collections-heading"
            className="text-xl font-semibold tracking-tight"
          >
            {t('navCollections')}
          </h2>
          {!isSignedIn ? (
            <p className="text-sm text-muted-foreground">
              {t('ctaBrowseCollectionsSignIn')}
            </p>
          ) : null}
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((album) => {
              const coverUrl = getAlbumCoverUrl(album);
              return (
                <li key={album.id}>
                  <div className="overflow-hidden rounded-lg border border-border bg-card">
                    <Link
                      href={collectionHref(album.slug, isSignedIn)}
                      className="group relative block overflow-hidden"
                    >
                      {coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={coverUrl}
                          alt={`${album.title} cover`}
                          className="aspect-video w-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex aspect-video w-full items-center justify-center bg-muted text-sm text-muted-foreground transition-colors group-hover:bg-muted/80">
                          {t('labelCollectionCover')}
                        </div>
                      )}
                      {album.card_badge_label ? (
                        <CollectionCardBadge
                          label={translateCollectionBadge(album.card_badge_label, lang)}
                        />
                      ) : null}
                    </Link>
                    <div className="flex items-end justify-between gap-3 p-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="truncate font-medium text-foreground">
                          {album.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {album.track_count}{' '}
                          {album.track_count === 1
                            ? t('labelTrackSingular')
                            : t('labelTrackPlural')}
                        </p>
                      </div>
                      <Button
                        variant="brand"
                        size="sm"
                        asChild
                        className="shrink-0 rounded-full"
                      >
                        <Link href={collectionHref(album.slug, isSignedIn)}>
                          {t('ctaPlayNow')}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      </div>
    </div>
  );
}
