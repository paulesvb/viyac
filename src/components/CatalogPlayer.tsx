'use client';

import { DashboardFeaturedMarquee } from '@/components/DashboardFeaturedMarquee';
import { DashboardMoreTrackRow } from '@/components/DashboardMoreTrackRow';
import { PlaybackControlsCard } from '@/components/PlaybackControlsCard';
import { useCatalogPlaybackQueue } from '@/hooks/use-catalog-playback-queue';
import type { DashboardTrack } from '@/lib/dashboard-track-types';
import { dashboardTracksMatch } from '@/lib/dashboard-tracks';
import { getTrackPosterUrl } from '@/lib/track-poster-url';

type Props = {
  /** Stable server order — never re-sorted. */
  tracks: DashboardTrack[];
  /** Track in the player before the user picks a row. */
  defaultTrack: DashboardTrack | null;
  /** Advance at end / transport next when true (default: multi-track lists). */
  queueEnabled?: boolean;
  /** No autoplay until the user taps a row (home featured preview). */
  gateAutoplayUntilPick?: boolean;
  loop?: boolean;
  onLoopChange?: (enabled: boolean) => void;
  /** External transport card above the player. */
  showTransportControls?: boolean;
  /** Marquee pill when idle / after user pick. */
  headingIdle: string;
  headingPlaying: string;
  /** Optional list below the player (same order as `tracks`). */
  listTracks?: DashboardTrack[];
  listSectionTitle?: string;
  listSectionId?: string;
  onPlayingChange?: (playing: boolean) => void;
  /** Split layout: parent owns transport and passes control nonces. */
  playbackControlAction?: 'toggle' | 'stop' | 'previous' | 'next';
  playbackControlNonce?: number;
  isPlaying?: boolean;
  onPlaybackToggle?: () => void;
  className?: string;
};

export function CatalogPlayer({
  tracks,
  defaultTrack,
  queueEnabled = tracks.length > 1,
  gateAutoplayUntilPick = false,
  loop = false,
  onLoopChange,
  showTransportControls = false,
  headingIdle,
  headingPlaying,
  listTracks,
  listSectionTitle,
  listSectionId = 'catalog-player-tracks',
  onPlayingChange,
  playbackControlAction: externalControlAction,
  playbackControlNonce: externalControlNonce = 0,
  isPlaying: externalIsPlaying,
  onPlaybackToggle,
  className,
}: Props) {
  const externalPlaybackControl =
    externalControlAction !== undefined
      ? { action: externalControlAction, nonce: externalControlNonce }
      : undefined;

  const queue = useCatalogPlaybackQueue({
    tracks,
    defaultTrack,
    queueEnabled,
    gateAutoplayUntilPick,
    loop,
    onLoopChange,
    onPlayingChange,
    externalPlaybackControl,
  });

  const {
    playerTrack,
    hasUserPick,
    isPlaying,
    repeatOne,
    setRepeatOne,
    handleRowPlayback,
    runPlaybackControl,
    skipToNext,
    skipToPrevious,
    effectiveAutoPlayNonce,
    playerControlAction,
    playbackControlNonce,
    handlePlayingChange,
    vaultQueueProps,
  } = queue;

  const controlAction = playerControlAction;
  const controlNonce = playbackControlNonce;
  const playing = externalIsPlaying ?? isPlaying;

  const handleRowClick = (track: DashboardTrack) => {
    if (onPlaybackToggle && playerTrack && dashboardTracksMatch(track, playerTrack)) {
      onPlaybackToggle();
    } else {
      handleRowPlayback(track);
    }
  };

  if (!playerTrack) return null;

  const rows = listTracks ?? tracks;
  const showTrackList =
    rows.length > 0 && (listTracks !== undefined || Boolean(listSectionTitle));

  return (
    <div className={className ?? 'space-y-8'}>
      {showTransportControls ? (
        <PlaybackControlsCard
          isPlaying={playing}
          loopEnabled={loop}
          onPrevious={queueEnabled ? skipToPrevious : undefined}
          onNext={queueEnabled ? skipToNext : undefined}
          onPlayPause={() => runPlaybackControl('toggle')}
          onStop={() => runPlaybackControl('stop')}
          onLoopChange={onLoopChange ?? (() => {})}
        />
      ) : null}

      <div className="w-full min-w-0 sm:flex-1">
        <DashboardFeaturedMarquee
          track={playerTrack}
          headingLabel={hasUserPick ? headingPlaying : headingIdle}
          autoPlayNonce={effectiveAutoPlayNonce}
          {...vaultQueueProps}
          playbackControlAction={controlAction}
          playbackControlNonce={controlNonce}
          onPlayingChange={handlePlayingChange}
          repeatOneEnabled={queueEnabled ? repeatOne : undefined}
          onRepeatOneChange={queueEnabled ? setRepeatOne : undefined}
        />
      </div>

      {showTrackList ? (
        <section
          className="min-w-0 space-y-4 overflow-x-hidden"
          aria-labelledby={listSectionTitle ? listSectionId : undefined}
          aria-label={listSectionTitle ? undefined : 'Tracks'}
        >
          {listSectionTitle ? (
            <h2
              id={listSectionId}
              className="text-xl font-semibold tracking-tight"
            >
              {listSectionTitle}
            </h2>
          ) : null}
          <ul className="grid min-w-0 gap-3 sm:grid-cols-2">
            {rows.map((track) => (
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
                  isPlaying={playing}
                  onPlayInPlayer={() => handleRowClick(track)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
