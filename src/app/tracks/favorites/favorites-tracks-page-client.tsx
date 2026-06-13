'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { VaultTrackData } from '@/components/VaultPlayer';
import { DashboardFeaturedMarquee } from '@/components/DashboardFeaturedMarquee';
import { DashboardMoreTrackRow } from '@/components/DashboardMoreTrackRow';
import { useTranslate } from '@/hooks/use-translate';
import { PlaybackControlsCard } from '@/components/PlaybackControlsCard';
import type { DashboardTrack } from '@/lib/dashboard-track-types';
import { dashboardTracksMatch, toVaultTrackData } from '@/lib/dashboard-tracks';
import { resolvePublicAssetsUrl } from '@/lib/storage';

type Props = {
  tracks: DashboardTrack[];
};

function getTrackPosterUrl(track: DashboardTrack): string | null {
  const source =
    track.thumbnail_url?.trim() ||
    track.lock_screen_art_path?.trim() ||
    process.env.NEXT_PUBLIC_MEDIA_SESSION_ART_URL?.trim();
  if (!source) return null;
  try {
    return resolvePublicAssetsUrl(source);
  } catch {
    return null;
  }
}

export default function FavoritesTracksPageClient({ tracks }: Props) {
  const t = useTranslate();
  const [sessionPlayingId, setSessionPlayingId] = useState<string | null>(null);
  const [autoPlayNonce, setAutoPlayNonce] = useState(0);
  const [repeatOne, setRepeatOne] = useState(false);
  const [loopFavorites, setLoopFavorites] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackControlAction, setPlaybackControlAction] = useState<
    'toggle' | 'stop'
  >('toggle');
  const [playbackControlNonce, setPlaybackControlNonce] = useState(0);

  const visible = useMemo(
    () => tracks.filter((t) => t.catalog_track_id),
    [tracks],
  );
  const playerTrack = useMemo(() => {
    if (visible.length === 0) return null;
    if (!sessionPlayingId) return visible[0] ?? null;
    const selected = visible.find((t) => t.catalog_track_id === sessionPlayingId);
    return selected ?? visible[0] ?? null;
  }, [visible, sessionPlayingId]);

  const playerTrackRef = useRef<DashboardTrack | null>(null);
  const repeatOneRef = useRef(repeatOne);
  const loopFavoritesRef = useRef(loopFavorites);
  const visibleRef = useRef(visible);

  useEffect(() => {
    playerTrackRef.current = playerTrack;
    repeatOneRef.current = repeatOne;
    loopFavoritesRef.current = loopFavorites;
    visibleRef.current = visible;
  }, [playerTrack, repeatOne, loopFavorites, visible]);

  const playTrackInPlayer = useCallback((track: DashboardTrack) => {
    const id = track.catalog_track_id?.trim();
    if (!id) return;
    playerTrackRef.current = track;
    setSessionPlayingId(id);
    setAutoPlayNonce((n) => n + 1);
  }, []);

  const handlePlayingChange = useCallback((playing: boolean) => {
    setIsPlaying(playing);
    if (playing) {
      setAutoPlayNonce((n) => (n > 0 ? n : 1));
    }
  }, []);

  const runPlaybackControl = useCallback((action: 'toggle' | 'stop') => {
    setPlaybackControlAction(action);
    setPlaybackControlNonce((n) => n + 1);
  }, []);

  const handleRowPlayback = useCallback(
    (track: DashboardTrack) => {
      if (playerTrack && dashboardTracksMatch(track, playerTrack)) {
        runPlaybackControl('toggle');
      } else {
        playTrackInPlayer(track);
      }
    },
    [playerTrack, playTrackInPlayer, runPlaybackControl],
  );

  const resolveQueueTrack = useCallback((direction: 'next' | 'previous'): VaultTrackData | null => {
    const current = playerTrackRef.current;
    if (!current) return null;
    if (direction === 'next' && repeatOneRef.current) {
      return toVaultTrackData(current);
    }
    const list = visibleRef.current;
    const id = current.catalog_track_id?.trim();
    if (!id) return null;
    const idx = list.findIndex((t) => t.catalog_track_id === id);
    if (idx < 0) return null;

    if (direction === 'next') {
      const next = list[idx + 1];
      if (next) return toVaultTrackData(next);
      if (loopFavoritesRef.current && list.length > 0) {
        return toVaultTrackData(list[0]);
      }
      return null;
    }

    const previous = list[idx - 1];
    if (previous) return toVaultTrackData(previous);
    if (loopFavoritesRef.current && list.length > 0) {
      return toVaultTrackData(list[list.length - 1]);
    }
    return null;
  }, []);

  const resolveNextTrack = useCallback(
    () => resolveQueueTrack('next'),
    [resolveQueueTrack],
  );

  const resolvePreviousTrack = useCallback(
    () => resolveQueueTrack('previous'),
    [resolveQueueTrack],
  );

  const onPlaybackEnded = useCallback(() => {
    const current = playerTrackRef.current;
    if (!current) return;
    if (repeatOneRef.current) {
      playTrackInPlayer(current);
      return;
    }
    const id = current.catalog_track_id?.trim();
    if (!id) return;
    const list = visibleRef.current;
    const idx = list.findIndex((t) => t.catalog_track_id === id);
    if (idx < 0) return;
    const next = list[idx + 1];
    if (next) {
      playTrackInPlayer(next);
    } else if (loopFavoritesRef.current && list.length > 0) {
      playTrackInPlayer(list[0]);
    }
  }, [playTrackInPlayer]);

  const onTrackAdvanced = useCallback((vault: VaultTrackData) => {
    const id = vault.catalog_track_id?.trim();
    if (id) {
      const match =
        visibleRef.current.find((t) => t.catalog_track_id === id) ?? null;
      playerTrackRef.current = match;
      setSessionPlayingId(id);
    }
  }, []);

  return (
    <div className="min-w-0 w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mx-auto mb-6 max-w-6xl sm:mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('pageFavoritesTitle')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tracks you saved from the player.
        </p>
      </header>

      <div className="mx-auto max-w-6xl">
        {visible.length > 0 ? (
          <div className="mb-4 sm:mb-6">
            <PlaybackControlsCard
              isPlaying={isPlaying}
              loopEnabled={loopFavorites}
              onPlayPause={() => runPlaybackControl('toggle')}
              onStop={() => runPlaybackControl('stop')}
              onLoopChange={setLoopFavorites}
            />
          </div>
        ) : null}

        {playerTrack ? (
          <div className="mb-6 sm:mb-8">
            <DashboardFeaturedMarquee
              track={playerTrack}
              headingLabel={
                sessionPlayingId ? t('badgeNowPlaying') : t('pageFavoritesTitle')
              }
              autoPlayNonce={sessionPlayingId ? autoPlayNonce : 0}
              onPlaybackEnded={onPlaybackEnded}
              resolveNextTrack={resolveNextTrack}
              resolvePreviousTrack={resolvePreviousTrack}
              onTrackAdvanced={onTrackAdvanced}
              playbackControlAction={playbackControlAction}
              playbackControlNonce={playbackControlNonce}
              onPlayingChange={handlePlayingChange}
              repeatOneEnabled={repeatOne}
              onRepeatOneChange={setRepeatOne}
            />
          </div>
        ) : null}

        {visible.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            {t('pageFavoritesEmptyPrefix')}{' '}
            <span className="font-medium text-foreground">{t('ctaFavorite')}</span>{' '}
            {t('pageFavoritesEmptySuffix')}
          </div>
        ) : (
          <ul className="grid min-w-0 gap-3 sm:grid-cols-2">
            {visible.map((track) => {
              const trackId = track.catalog_track_id?.trim();
              if (!trackId) return null;
              const posterUrl = getTrackPosterUrl(track);

              return (
                <li key={trackId} className="min-w-0 max-w-full">
                  <DashboardMoreTrackRow
                    track={track}
                    posterUrl={posterUrl}
                    isActive={
                      playerTrack != null &&
                      dashboardTracksMatch(track, playerTrack)
                    }
                    isPlaying={isPlaying}
                    onPlayInPlayer={() => handleRowPlayback(track)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
