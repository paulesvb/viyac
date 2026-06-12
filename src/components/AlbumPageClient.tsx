'use client';

import { useState } from 'react';
import { AlbumTracksPlayerClient } from '@/components/AlbumTracksPlayerClient';
import { PlaybackControlsCard } from '@/components/PlaybackControlsCard';
import { useTranslate } from '@/hooks/use-translate';
import type { DashboardTrack } from '@/lib/dashboard-track-types';

type Props = {
  albumTitle: string;
  albumSlug: string;
  coverUrl: string | null;
  tracks: DashboardTrack[];
};

export function AlbumPageClient({
  albumTitle,
  albumSlug,
  coverUrl,
  tracks,
}: Props) {
  const t = useTranslate();
  const [loopAlbum, setLoopAlbum] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackControlAction, setPlaybackControlAction] = useState<
    'toggle' | 'stop'
  >('toggle');
  const [playbackControlNonce, setPlaybackControlNonce] = useState(0);

  const runPlaybackControl = (action: 'toggle' | 'stop') => {
    setPlaybackControlAction(action);
    setPlaybackControlNonce((n) => n + 1);
  };

  return (
    <>
      <header className="overflow-hidden rounded-xl border border-border bg-card">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={`${albumTitle} cover`}
            className="max-h-72 w-full object-cover"
          />
        ) : (
          <div className="flex h-36 w-full items-center justify-center bg-muted text-muted-foreground">
            {t('labelCollection')}
          </div>
        )}
        <div className="space-y-2 p-4">
          <h1 className="text-2xl font-bold tracking-tight">{albumTitle}</h1>
          <p className="text-sm text-muted-foreground">
            {tracks.length}{' '}
            {tracks.length === 1
              ? t('labelTrackSingular')
              : t('labelTrackPlural')}
          </p>
        </div>
      </header>

      {tracks.length > 0 ? (
        <>
          <div className="mb-4 sm:mb-6">
            <PlaybackControlsCard
              isPlaying={isPlaying}
              loopEnabled={loopAlbum}
              onPlayPause={() => runPlaybackControl('toggle')}
              onStop={() => runPlaybackControl('stop')}
              onLoopChange={setLoopAlbum}
            />
          </div>
          <AlbumTracksPlayerClient
            albumSlug={albumSlug}
            tracks={tracks}
            loopAlbum={loopAlbum}
            playbackControlAction={playbackControlAction}
            playbackControlNonce={playbackControlNonce}
            onPlayingChange={setIsPlaying}
            isPlaying={isPlaying}
            onPlaybackToggle={() => runPlaybackControl('toggle')}
          />
        </>
      ) : (
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          {t('albumEmptyTracks')}
        </div>
      )}
    </>
  );
}
