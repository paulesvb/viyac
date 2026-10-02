'use client';

import { useEffect } from 'react';

import { DashboardMoreTrackRow } from '@/components/DashboardMoreTrackRow';
import { PlaybackControlsCard } from '@/components/PlaybackControlsCard';
import {
  samePlaybackQueue,
  usePlayback,
} from '@/components/persistent-playback/playback-context';
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
  /** Kept for call sites. The persistent engine never autoplays on page load. */
  gateAutoplayUntilPick?: boolean;
  loop?: boolean;
  onLoopChange?: (enabled: boolean) => void;
  /** External transport card. Home places it under the player. */
  showTransportControls?: boolean;
  /** When true, the transport card renders under the player instead of above it. */
  transportControlsBelow?: boolean;
  /** When true, the transport card renders under the section title and above the track cards. */
  transportControlsAfterList?: boolean;
  /** Poster and title block above the list. Home uses the bottom player instead. */
  showNowPlayingStage?: boolean;
  /** Marquee pill when idle / after user pick. */
  headingIdle: string;
  headingPlaying: string;
  /** Optional list below the player (same order as `tracks`). */
  listTracks?: DashboardTrack[];
  listSectionTitle?: string;
  listSectionId?: string;
  onPlayingChange?: (playing: boolean) => void;
  /** Unused while playback lives in the layout. Kept so existing pages still type-check. */
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
  loop = false,
  onLoopChange,
  showTransportControls = false,
  transportControlsBelow = false,
  transportControlsAfterList = false,
  showNowPlayingStage = true,
  headingIdle,
  headingPlaying,
  listTracks,
  listSectionTitle,
  listSectionId = 'catalog-player-tracks',
  onPlayingChange,
  onPlaybackToggle,
  className,
}: Props) {
  const playback = usePlayback();
  const session = playback.session;
  const ownsQueue = session != null && samePlaybackQueue(session.tracks, tracks);
  const sessionTrack = session ? (session.tracks[session.index] ?? null) : null;
  const current = ownsQueue ? sessionTrack : null;
  const stageTrack = current ?? (session ? null : defaultTrack);
  const playingHere = ownsQueue && playback.playing;
  const loopEnabled = ownsQueue && session ? session.loop : loop;

  useEffect(() => {
    if (!ownsQueue) return;
    onPlayingChange?.(playback.playing);
  }, [ownsQueue, onPlayingChange, playback.playing]);

  const startTrack = (track: DashboardTrack) => {
    playback.playQueue(tracks, track, { loop, queueEnabled });
  };

  const handleRowClick = (track: DashboardTrack) => {
    if (sessionTrack && dashboardTracksMatch(track, sessionTrack)) {
      if (onPlaybackToggle) onPlaybackToggle();
      else playback.toggle();
      return;
    }
    startTrack(track);
  };

  if (tracks.length === 0 && !stageTrack) return null;

  const poster = stageTrack ? getTrackPosterUrl(stageTrack) : null;
  const rows = listTracks ?? tracks;
  const showTrackList =
    rows.length > 0 && (listTracks !== undefined || Boolean(listSectionTitle));

  const transportControls = showTransportControls ? (
    <PlaybackControlsCard
      isPlaying={playingHere}
      loopEnabled={loopEnabled}
      onPrevious={queueEnabled && ownsQueue ? playback.previous : undefined}
      onNext={queueEnabled && ownsQueue ? playback.next : undefined}
      onPlayPause={() => {
        if (ownsQueue) playback.toggle();
        else if (defaultTrack) startTrack(defaultTrack);
      }}
      onStop={() => {
        if (ownsQueue) playback.stop();
      }}
      onLoopChange={(enabled) => {
        onLoopChange?.(enabled);
        if (ownsQueue) playback.setLoop(enabled);
      }}
    />
  ) : null;

  return (
    <div className={className ?? 'space-y-8'}>
      {transportControlsBelow || transportControlsAfterList
        ? null
        : transportControls}

      {showNowPlayingStage && stageTrack ? (
        <section className="overflow-hidden rounded-xl border border-cyan-500/25 bg-zinc-950">
          <div className="flex items-center gap-4 p-4">
            {poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={poster}
                alt=""
                className="h-20 w-20 shrink-0 rounded-md object-cover sm:h-24 sm:w-24"
              />
            ) : (
              <div className="h-20 w-20 shrink-0 rounded-md bg-zinc-800 sm:h-24 sm:w-24" />
            )}
            <div className="min-w-0">
              <span className="rounded-full bg-cyan-400/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-cyan-300">
                {ownsQueue ? headingPlaying : headingIdle}
              </span>
              <h2 className="mt-2 truncate text-lg font-semibold tracking-tight">
                {stageTrack.title}
              </h2>
            </div>
          </div>
        </section>
      ) : null}

      {transportControlsBelow && !transportControlsAfterList
        ? transportControls
        : null}

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
          {transportControlsAfterList ? transportControls : null}
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
                    sessionTrack != null &&
                    dashboardTracksMatch(track, sessionTrack)
                  }
                  isPlaying={
                    playback.playing &&
                    sessionTrack != null &&
                    dashboardTracksMatch(track, sessionTrack)
                  }
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
