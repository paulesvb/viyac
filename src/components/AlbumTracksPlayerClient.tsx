'use client';

import { CatalogPlayer } from '@/components/CatalogPlayer';
import { useTranslate } from '@/hooks/use-translate';
import type { DashboardTrack } from '@/lib/dashboard-track-types';

type Props = {
  tracks: DashboardTrack[];
  loopAlbum: boolean;
  onLoopChange?: (enabled: boolean) => void;
  playbackControlAction?: 'toggle' | 'stop' | 'previous' | 'next';
  playbackControlNonce?: number;
  onPlayingChange?: (playing: boolean) => void;
  isPlaying?: boolean;
  onPlaybackToggle?: () => void;
  showTransportControls?: boolean;
};

/** @deprecated Use `CatalogPlayer` directly. Thin wrapper for album pages. */
export function AlbumTracksPlayerClient({
  tracks,
  loopAlbum,
  onLoopChange,
  playbackControlAction,
  playbackControlNonce = 0,
  onPlayingChange,
  isPlaying = false,
  onPlaybackToggle,
  showTransportControls = false,
}: Props) {
  const t = useTranslate();
  const firstTrack = tracks[0] ?? null;

  return (
    <CatalogPlayer
      tracks={tracks}
      defaultTrack={firstTrack}
      queueEnabled={tracks.length > 1}
      loop={loopAlbum}
      onLoopChange={onLoopChange}
      showTransportControls={showTransportControls}
      headingIdle={t('badgeFromCollection')}
      headingPlaying={t('badgeNowPlaying')}
      listTracks={tracks}
      listSectionTitle={t('sectionMoreTracks')}
      listSectionId="album-more-tracks-heading"
      playbackControlAction={playbackControlAction}
      playbackControlNonce={playbackControlNonce}
      onPlayingChange={onPlayingChange}
      isPlaying={isPlaying}
      onPlaybackToggle={onPlaybackToggle}
    />
  );
}
