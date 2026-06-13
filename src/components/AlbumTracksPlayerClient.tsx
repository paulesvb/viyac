'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { VaultTrackData } from '@/components/VaultPlayer';
import { DashboardFeaturedMarquee } from '@/components/DashboardFeaturedMarquee';
import { DashboardMoreTrackRow } from '@/components/DashboardMoreTrackRow';
import { useTranslate } from '@/hooks/use-translate';
import type { DashboardTrack } from '@/lib/dashboard-track-types';
import {
  dashboardTracksMatch,
  getAlbumTracksExcludingPlaying,
  toVaultTrackData,
} from '@/lib/dashboard-tracks';
import { resolvePublicAssetsUrl } from '@/lib/storage';

function indexOfTrackInAlbum(
  albumTracks: DashboardTrack[],
  current: DashboardTrack,
): number {
  const id = current.catalog_track_id?.trim();
  if (id) {
    const byId = albumTracks.findIndex((t) => t.catalog_track_id === id);
    if (byId >= 0) return byId;
  }
  return albumTracks.findIndex((t) => t.slug === current.slug);
}

type Props = {
  albumSlug: string;
  tracks: DashboardTrack[];
  loopAlbum: boolean;
  playbackControlAction?: 'toggle' | 'stop' | 'previous' | 'next';
  playbackControlNonce?: number;
  onPlayingChange?: (playing: boolean) => void;
  isPlaying?: boolean;
  onPlaybackToggle?: () => void;
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

export function AlbumTracksPlayerClient({
  albumSlug,
  tracks,
  loopAlbum,
  playbackControlAction,
  playbackControlNonce = 0,
  onPlayingChange,
  isPlaying = false,
  onPlaybackToggle,
}: Props) {
  const t = useTranslate();
  const firstTrack = tracks[0] ?? null;
  const [repeatOne, setRepeatOne] = useState(false);
  const [sessionPlaying, setSessionPlaying] = useState<DashboardTrack | null>(
    null,
  );
  const [autoPlayNonce, setAutoPlayNonce] = useState(0);
  const handledTrackControlNonceRef = useRef<number | null>(null);
  const playerTrackRef = useRef<DashboardTrack | null>(null);
  const repeatOneRef = useRef(repeatOne);
  const loopAlbumRef = useRef(loopAlbum);
  const tracksRef = useRef(tracks);
  const playerTrack = sessionPlaying ?? firstTrack;

  useEffect(() => {
    playerTrackRef.current = playerTrack;
    repeatOneRef.current = repeatOne;
    loopAlbumRef.current = loopAlbum;
    tracksRef.current = tracks;
  }, [playerTrack, repeatOne, loopAlbum, tracks]);
  const listTracks = useMemo(() => {
    if (!playerTrack) return [];
    return getAlbumTracksExcludingPlaying(tracks, playerTrack);
  }, [tracks, playerTrack]);

  const playTrackInPlayer = useCallback((track: DashboardTrack) => {
    playerTrackRef.current = track;
    setSessionPlaying(track);
    setAutoPlayNonce((n) => n + 1);
  }, []);

  const handlePlayingChange = useCallback(
    (playing: boolean) => {
      onPlayingChange?.(playing);
      if (playing) {
        setSessionPlaying((current) => {
          const active = current ?? playerTrack;
          if (active) playerTrackRef.current = active;
          return active;
        });
        setAutoPlayNonce((n) => (n > 0 ? n : 1));
      }
    },
    [onPlayingChange, playerTrack],
  );

  const handleRowPlayback = useCallback(
    (track: DashboardTrack) => {
      if (playerTrack && dashboardTracksMatch(track, playerTrack)) {
        onPlaybackToggle?.();
      } else {
        playTrackInPlayer(track);
      }
    },
    [playerTrack, onPlaybackToggle, playTrackInPlayer],
  );

  const resolveQueueTrack = useCallback((direction: 'next' | 'previous'): VaultTrackData | null => {
    const current = playerTrackRef.current;
    if (!current) return null;
    if (direction === 'next' && repeatOneRef.current) {
      return toVaultTrackData(current);
    }
    const list = tracksRef.current;
    if (list.length === 0) return null;
    const idx = indexOfTrackInAlbum(list, current);
    if (idx < 0) return null;

    if (direction === 'next') {
      const next = idx + 1;
      if (next < list.length) return toVaultTrackData(list[next]);
      if (loopAlbumRef.current) return toVaultTrackData(list[0]);
      return null;
    }

    const previous = idx - 1;
    if (previous >= 0) return toVaultTrackData(list[previous]);
    if (loopAlbumRef.current) return toVaultTrackData(list[list.length - 1]);
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

  const findDashboardTrack = useCallback((vault: VaultTrackData): DashboardTrack | null => {
    const list = tracksRef.current;
    const id = vault.catalog_track_id?.trim();
    if (id) {
      const byId = list.find((t) => t.catalog_track_id === id);
      if (byId) return byId;
    }
    return list.find((t) => t.track_path === vault.track_path) ?? null;
  }, []);

  const onPlaybackEnded = useCallback(() => {
    const current = playerTrackRef.current;
    if (!current) return;
    if (repeatOneRef.current) {
      playTrackInPlayer(current);
      return;
    }
    const list = tracksRef.current;
    if (list.length === 0) return;
    const idx = indexOfTrackInAlbum(list, current);
    if (idx < 0) return;
    const next = idx + 1;
    if (next < list.length) {
      playTrackInPlayer(list[next]);
    } else if (loopAlbumRef.current) {
      playTrackInPlayer(list[0]);
    }
  }, [playTrackInPlayer]);

  const onTrackAdvanced = useCallback(
    (vault: VaultTrackData) => {
      const match = findDashboardTrack(vault);
      if (match) {
        playerTrackRef.current = match;
        setSessionPlaying(match);
        setAutoPlayNonce((n) => n + 1);
      }
    },
    [findDashboardTrack],
  );

  useEffect(() => {
    if (!playerTrack) return;
    if (playbackControlAction !== 'previous' && playbackControlAction !== 'next') {
      return;
    }
    if (handledTrackControlNonceRef.current === playbackControlNonce) return;
    handledTrackControlNonceRef.current = playbackControlNonce;
    if (tracks.length === 0) return;
    const idx = indexOfTrackInAlbum(tracks, playerTrack);
    if (idx < 0) return;

    if (playbackControlAction === 'next') {
      const next = idx + 1;
      if (next < tracks.length) {
        playTrackInPlayer(tracks[next]);
      } else if (loopAlbum) {
        playTrackInPlayer(tracks[0]);
      }
      return;
    }

    const previous = idx - 1;
    if (previous >= 0) {
      playTrackInPlayer(tracks[previous]);
    } else if (loopAlbum) {
      playTrackInPlayer(tracks[tracks.length - 1]);
    }
  }, [
    playbackControlAction,
    playbackControlNonce,
    playerTrack,
    tracks,
    loopAlbum,
    playTrackInPlayer,
  ]);

  const playerControlAction =
    playbackControlAction === 'toggle' || playbackControlAction === 'stop'
      ? playbackControlAction
      : undefined;

  if (!playerTrack) return null;

  return (
    <div className="space-y-8">
      <div className="w-full min-w-0 sm:flex-1">
        <DashboardFeaturedMarquee
          track={playerTrack}
          headingLabel={
            sessionPlaying != null ? t('badgeNowPlaying') : t('badgeFromCollection')
          }
          autoPlayNonce={autoPlayNonce}
          onPlaybackEnded={onPlaybackEnded}
          resolveNextTrack={resolveNextTrack}
          resolvePreviousTrack={resolvePreviousTrack}
          onTrackAdvanced={onTrackAdvanced}
          playbackControlAction={playerControlAction}
          playbackControlNonce={playbackControlNonce}
          onPlayingChange={handlePlayingChange}
          repeatOneEnabled={repeatOne}
          onRepeatOneChange={setRepeatOne}
        />
      </div>

      {listTracks.length > 0 ? (
        <section
          className="min-w-0 space-y-4 overflow-x-hidden"
          aria-labelledby="album-more-tracks-heading"
        >
          <h2
            id="album-more-tracks-heading"
            className="text-xl font-semibold tracking-tight"
          >
            {t('sectionMoreTracks')}
          </h2>
          <ul className="grid min-w-0 gap-3 sm:grid-cols-2">
            {listTracks.map((track) => (
              <li
                key={track.catalog_track_id ?? track.slug}
                className="min-w-0 max-w-full"
              >
                <DashboardMoreTrackRow
                  track={track}
                  posterUrl={getTrackPosterUrl(track)}
                  isActive={
                    playerTrack != null && dashboardTracksMatch(track, playerTrack)
                  }
                  isPlaying={isPlaying}
                  onPlayInPlayer={() => handleRowPlayback(track)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
