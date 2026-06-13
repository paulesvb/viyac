'use client';

import { useMemo, useState } from 'react';
import { CatalogPlayer } from '@/components/CatalogPlayer';
import { useTranslate } from '@/hooks/use-translate';
import type { DashboardTrack } from '@/lib/dashboard-track-types';

type Props = {
  tracks: DashboardTrack[];
};

export default function FavoritesTracksPageClient({ tracks }: Props) {
  const t = useTranslate();
  const [loopFavorites, setLoopFavorites] = useState(false);

  const playable = useMemo(
    () => tracks.filter((track) => track.catalog_track_id),
    [tracks],
  );

  const defaultTrack = playable[0] ?? null;

  if (playable.length === 0) {
    return (
      <div className="min-w-0 w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <header className="mx-auto mb-6 max-w-6xl sm:mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t('pageFavoritesTitle')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tracks you saved from the player.
          </p>
        </header>
        <div className="mx-auto max-w-6xl">
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            {t('pageFavoritesEmptyPrefix')}{' '}
            <span className="font-medium text-foreground">{t('ctaFavorite')}</span>{' '}
            {t('pageFavoritesEmptySuffix')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mx-auto mb-6 max-w-6xl sm:mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {t('pageFavoritesTitle')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tracks you saved from the player.
        </p>
      </header>

      <div className="mx-auto max-w-6xl">
        <CatalogPlayer
          tracks={playable}
          defaultTrack={defaultTrack}
          queueEnabled
          gateAutoplayUntilPick
          loop={loopFavorites}
          onLoopChange={setLoopFavorites}
          showTransportControls
          headingIdle={t('pageFavoritesTitle')}
          headingPlaying={t('badgeNowPlaying')}
          listTracks={playable}
          className="space-y-6 sm:space-y-8"
        />
      </div>
    </div>
  );
}
