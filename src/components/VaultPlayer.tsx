'use client';

import Hls from 'hls.js';
import { Pause, Play } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';

import { vaultStreamUrl } from '@/lib/vault-stream';

export type VaultTrackData = {
  /** Full URL — typically `assets` bucket public URL or any CDN URL */
  bg_image_url: string;
  content_type: 'video' | 'audio';
  /** Path in the private `vault` bucket (e.g. `userId/folder/playlist.m3u8`) */
  track_path: string;
  /** Full URL — typically public `assets` thumbnail */
  thumbnail_url?: string;
  title?: string;
  description_en?: string;
  description_es?: string;
};

type VaultPlayerProps = {
  trackData: VaultTrackData;
  /**
   * `embedded` keeps backgrounds inside the component (for dashboard, etc.).
   * `fullscreen` uses fixed layers over the whole viewport (default).
   */
  variant?: 'fullscreen' | 'embedded';
};

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function WaveformProgress({
  progress,
  onSeek,
  playing,
}: {
  progress: number;
  onSeek: (e: MouseEvent<HTMLDivElement>) => void;
  playing: boolean;
}) {
  const bars = 40;
  return (
    <div
      className="relative w-full cursor-pointer select-none"
      onClick={onSeek}
      onContextMenu={(e) => e.preventDefault()}
      role="presentation"
    >
      <div className="flex h-12 items-end justify-between gap-px rounded-lg bg-black/40 px-1 py-2 ring-1 ring-white/10">
        {Array.from({ length: bars }).map((_, i) => {
          const h = 25 + ((i * 11) % 75);
          const barProgress = bars <= 1 ? 0 : i / (bars - 1);
          const active = barProgress <= progress;
          return (
            <div
              key={i}
              className={`min-w-[3px] flex-1 rounded-sm transition-colors duration-150 ${
                active ? 'bg-white/85' : 'bg-white/18'
              } ${playing && active ? 'animate-pulse' : ''}`}
              style={{ height: `${h}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}

function LinearProgress({
  progress,
  onSeek,
}: {
  progress: number;
  onSeek: (e: MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className="group relative h-2 w-full cursor-pointer rounded-full bg-white/20"
      onClick={onSeek}
      onContextMenu={(e) => e.preventDefault()}
      role="presentation"
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-fuchsia-400/90 to-violet-400/90"
        style={{ width: `${progress * 100}%` }}
      />
      <div
        className="pointer-events-none absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow-md opacity-0 transition-opacity group-hover:opacity-100"
        style={{ left: `calc(${progress * 100}% - 6px)` }}
      />
    </div>
  );
}

export function VaultPlayer({
  trackData,
  variant = 'fullscreen',
}: VaultPlayerProps) {
  const {
    bg_image_url,
    content_type,
    track_path,
    thumbnail_url,
    title,
    description_en,
    description_es,
  } = trackData;

  const [streamError, setStreamError] = useState<{
    path: string;
    message: string;
  } | null>(null);
  const loadError =
    streamError?.path === track_path ? streamError.message : null;

  const [lang, setLang] = useState<'en' | 'es'>('en');

  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [readyForPath, setReadyForPath] = useState<string | null>(null);
  const mediaReady = readyForPath === track_path;

  const playUrl = useMemo(() => vaultStreamUrl(track_path), [track_path]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media || !playUrl) return;

    const destroyHls = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };

    destroyHls();
    media.pause();
    media.removeAttribute('src');

    const onMediaError = () => {
      const code = media.error?.code;
      const map: Record<number, string> = {
        1: 'Playback aborted',
        2: 'Network error',
        3: 'Decode error',
        4: 'Source not supported',
      };
      setStreamError({
        path: track_path,
        message:
          code != null ? map[code] ?? `Media error (${code})` : 'Playback failed',
      });
    };

    if (media.canPlayType('application/vnd.apple.mpegurl')) {
      media.src = playUrl;
    } else if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
      });
      hlsRef.current = hls;
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        const message =
          data.type === Hls.ErrorTypes.NETWORK_ERROR
            ? 'Network error while loading the stream.'
            : data.type === Hls.ErrorTypes.MEDIA_ERROR
              ? 'Media error during playback.'
              : 'Could not play this stream.';
        setStreamError({ path: track_path, message });
      });
      hls.loadSource(playUrl);
      hls.attachMedia(media);
    } else {
      media.src = playUrl;
    }

    const onTime = () => setCurrentTime(media.currentTime);
    const onDuration = () => {
      setReadyForPath(track_path);
      const d = media.duration;
      if (Number.isFinite(d)) setDuration(d);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    media.addEventListener('timeupdate', onTime);
    media.addEventListener('loadedmetadata', onDuration);
    media.addEventListener('durationchange', onDuration);
    media.addEventListener('play', onPlay);
    media.addEventListener('pause', onPause);
    media.addEventListener('error', onMediaError);

    return () => {
      media.removeEventListener('timeupdate', onTime);
      media.removeEventListener('loadedmetadata', onDuration);
      media.removeEventListener('durationchange', onDuration);
      media.removeEventListener('play', onPlay);
      media.removeEventListener('pause', onPause);
      media.removeEventListener('error', onMediaError);
      destroyHls();
      media.pause();
      media.removeAttribute('src');
      media.load();
    };
  }, [playUrl, content_type, track_path]);

  const progress = duration > 0 ? currentTime / duration : 0;

  const seekFromEvent = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const media = mediaRef.current;
      if (!media || !Number.isFinite(duration) || duration <= 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
      media.currentTime = (x / rect.width) * duration;
    },
    [duration],
  );

  const togglePlay = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    if (media.paused) {
      void media.play().catch(() => {});
    } else {
      media.pause();
    }
  }, []);

  const description =
    lang === 'en' ? description_en ?? description_es : description_es ?? description_en;

  const hasBothLang =
    Boolean(description_en?.trim()) && Boolean(description_es?.trim());

  const embedded = variant === 'embedded';
  const layer = embedded ? 'absolute' : 'fixed';
  const shellMin = embedded
    ? 'min-h-[min(560px,78dvh)] sm:min-h-[min(600px,80dvh)]'
    : 'min-h-[100dvh]';

  return (
    <div
      className={`relative w-full overflow-hidden ${shellMin} ${embedded ? 'rounded-2xl ring-1 ring-white/10' : ''}`}
    >
      <div className={`pointer-events-none ${layer} inset-0 z-0`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bg_image_url}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>

      <div
        className={`${layer} inset-0 z-10 backdrop-blur-3xl bg-black/60`}
        aria-hidden
      />

      <div
        className={`relative z-20 flex ${shellMin} flex-col items-center justify-center p-4 sm:p-8`}
      >
        <div
          className="w-full max-w-3xl rounded-2xl border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-md sm:p-8"
          style={{
            boxShadow:
              '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
          }}
        >
          {loadError ? (
            <p className="mb-4 text-center text-sm text-red-300">{loadError}</p>
          ) : null}

          <div
            className="select-none"
            onContextMenu={(e) => e.preventDefault()}
          >
            {content_type === 'video' ? (
              <div className="space-y-3">
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black ring-1 ring-white/10">
                  <video
                    ref={(el) => {
                      mediaRef.current = el;
                    }}
                    className="h-full w-full object-contain"
                    playsInline
                    preload="metadata"
                    controls={false}
                    controlsList="nodownload"
                    disablePictureInPicture
                    onContextMenu={(e) => e.preventDefault()}
                  />
                  {!mediaReady ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm text-white/80">
                      Loading stream…
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-zinc-900 shadow-lg transition hover:bg-white/90"
                    aria-label={playing ? 'Pause' : 'Play'}
                  >
                    {playing ? (
                      <Pause className="h-5 w-5" fill="currentColor" />
                    ) : (
                      <Play className="h-5 w-5 pl-0.5" fill="currentColor" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1 space-y-1">
                    <LinearProgress progress={progress} onSeek={seekFromEvent} />
                    <div className="flex justify-between text-xs tabular-nums text-white/70">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-6">
                  <div
                    className={`relative flex h-56 w-56 items-center justify-center sm:h-64 sm:w-64 ${
                      playing ? 'animate-[spin_8s_linear_infinite]' : ''
                    }`}
                  >
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/25 to-transparent ring-2 ring-white/20" />
                    {thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbnail_url}
                        alt=""
                        draggable={false}
                        className="relative z-10 h-[88%] w-[88%] rounded-full object-cover shadow-2xl ring-4 ring-black/40"
                      />
                    ) : (
                      <div className="relative z-10 flex h-[88%] w-[88%] items-center justify-center rounded-full bg-zinc-800 text-4xl text-white/40 ring-4 ring-black/40">
                        ♪
                      </div>
                    )}
                    <div className="absolute left-1/2 top-1/2 z-20 h-full w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-950/90 shadow-lg ring-1 ring-white/20" />
                  </div>

                  <audio
                    ref={(el) => {
                      mediaRef.current = el;
                    }}
                    className="sr-only"
                    playsInline
                    preload="metadata"
                    controls={false}
                  />

                  {!mediaReady ? (
                    <p className="text-sm text-white/70">Loading stream…</p>
                  ) : null}

                  <div className="w-full max-w-md space-y-4">
                    <WaveformProgress
                      progress={progress}
                      onSeek={seekFromEvent}
                      playing={playing}
                    />
                    <div className="flex items-center justify-center gap-4">
                      <button
                        type="button"
                        onClick={togglePlay}
                        className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-zinc-900 shadow-xl transition hover:bg-white/90"
                        aria-label={playing ? 'Pause' : 'Play'}
                      >
                        {playing ? (
                          <Pause className="h-7 w-7" fill="currentColor" />
                        ) : (
                          <Play className="h-7 w-7 pl-1" fill="currentColor" />
                        )}
                      </button>
                      <div className="text-sm tabular-nums text-white/80">
                        <span>{formatTime(currentTime)}</span>
                        <span className="mx-1 text-white/40">/</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {(title || description) && (
            <div className="mt-8 space-y-3 border-t border-white/10 pt-6">
              {title ? (
                <h1 className="text-center text-xl font-semibold tracking-tight text-white drop-shadow sm:text-2xl">
                  {title}
                </h1>
              ) : null}

              {(description_en?.trim() || description_es?.trim()) && (
                <div className="space-y-2">
                  {hasBothLang ? (
                    <div className="flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setLang('en')}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                          lang === 'en'
                            ? 'bg-white text-zinc-900'
                            : 'bg-white/10 text-white/80 hover:bg-white/20'
                        }`}
                      >
                        EN
                      </button>
                      <button
                        type="button"
                        onClick={() => setLang('es')}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                          lang === 'es'
                            ? 'bg-white text-zinc-900'
                            : 'bg-white/10 text-white/80 hover:bg-white/20'
                        }`}
                      >
                        ES
                      </button>
                    </div>
                  ) : null}
                  {description ? (
                    <p className="text-center text-sm leading-relaxed text-white/90 sm:text-base">
                      {description}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
