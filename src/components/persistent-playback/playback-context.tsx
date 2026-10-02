'use client';

import Hls from 'hls.js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { Repeat } from 'lucide-react';

import { PersistentPlayerSheet } from '@/components/persistent-playback/PersistentPlayerSheet';
import { useCatalogListenHeartbeat } from '@/hooks/use-catalog-listen-heartbeat';
import type { DashboardTrack } from '@/lib/dashboard-track-types';
import { indexOfCatalogTrack } from '@/lib/dashboard-tracks';
import { getTrackPosterUrl } from '@/lib/track-poster-url';
import { resolvePublicAssetsUrl } from '@/lib/storage';
import { vaultStreamUrl } from '@/lib/vault-stream';

export type PlaybackSession = {
  id: string;
  tracks: DashboardTrack[];
  index: number;
  loop: boolean;
  repeatOne: boolean;
  queueEnabled: boolean;
};

type PlayQueueOptions = {
  loop?: boolean;
  queueEnabled?: boolean;
};

type PlaybackContextValue = {
  session: PlaybackSession | null;
  /** Layout-owned element. Views may attach to it; they must not pause or remove it on unmount. */
  media: HTMLAudioElement | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  error: string | null;
  playQueue: (
    tracks: DashboardTrack[],
    start: DashboardTrack,
    options?: PlayQueueOptions,
  ) => void;
  toggle: () => void;
  stop: () => void;
  next: () => void;
  previous: () => void;
  setLoop: (loop: boolean) => void;
  setRepeatOne: (repeatOne: boolean) => void;
};

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export function usePlayback(): PlaybackContextValue {
  const value = useContext(PlaybackContext);
  if (!value) {
    throw new Error('usePlayback must be used within PlaybackProvider');
  }
  return value;
}

export function samePlaybackQueue(
  a: DashboardTrack[],
  b: DashboardTrack[],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const aId = a[i]?.catalog_track_id?.trim() || a[i]?.slug;
    const bId = b[i]?.catalog_track_id?.trim() || b[i]?.slug;
    if (aId !== bId) return false;
  }
  return true;
}

function trackAt(session: PlaybackSession | null): DashboardTrack | null {
  if (!session) return null;
  return session.tracks[session.index] ?? null;
}

/** Helps iOS pick up new artwork when the storage path changes. */
function withLockScreenArtCacheBust(url: string): string {
  try {
    const parsed = new URL(url);
    const key = parsed.pathname.replace(/[^\w-]+/g, '').slice(-48) || 'art';
    if (!parsed.searchParams.has('v')) {
      parsed.searchParams.set('v', key);
    }
    return parsed.href;
  } catch {
    return url;
  }
}

function lockScreenArtForTrack(track: DashboardTrack): string | null {
  const raw =
    track.lock_screen_art_path?.trim() ||
    track.thumbnail_url?.trim() ||
    process.env.NEXT_PUBLIC_MEDIA_SESSION_ART_URL?.trim() ||
    '';
  if (!raw) return null;
  let absolute: string;
  try {
    absolute = resolvePublicAssetsUrl(raw);
  } catch {
    return null;
  }
  if (typeof window !== 'undefined') {
    try {
      absolute = new URL(absolute, window.location.href).href;
    } catch {
      /* keep the resolved URL */
    }
  }
  return withLockScreenArtCacheBust(absolute);
}

function artworkType(url: string): string | undefined {
  const path = url.split('?')[0]?.toLowerCase() ?? '';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  if (path.endsWith('.webp')) return 'image/webp';
  return undefined;
}

function applyLockScreenMetadata(track: DashboardTrack) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  const title = track.title?.trim() || 'Track';
  const artist = track.album_title?.trim() || '';
  const artworkHref = lockScreenArtForTrack(track);
  const artwork = artworkHref
    ? [
        {
          src: artworkHref,
          sizes: '512x512',
          type: artworkType(artworkHref),
        },
        {
          src: artworkHref,
          sizes: '256x256',
          type: artworkType(artworkHref),
        },
      ]
    : [];
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      album: artist,
      artwork,
    });
  } catch {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title, artist });
    } catch {
      /* ignore */
    }
  }
}

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [media, setMedia] = useState<HTMLAudioElement | null>(null);
  const [session, setSession] = useState<PlaybackSession | null>(null);
  const [intentPlaying, setIntentPlaying] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef(session);
  const intentRef = useRef(intentPlaying);
  sessionRef.current = session;
  intentRef.current = intentPlaying;

  const current = trackAt(session);

  const advance = useCallback((direction: 1 | -1 | 'ended') => {
    const currentSession = sessionRef.current;
    const media = audioRef.current;
    if (!currentSession || !media) return;

    if (direction === 'ended' && currentSession.repeatOne) {
      try {
        media.currentTime = 0;
      } catch {
        /* ignore */
      }
      setIntentPlaying(true);
      void media.play().catch(() => {});
      return;
    }

    if (!currentSession.queueEnabled && direction === 'ended') {
      setIntentPlaying(false);
      setPlaying(false);
      return;
    }

    const last = currentSession.tracks.length - 1;
    let index = currentSession.index;
    if (direction === 'ended' || direction === 1) {
      if (index < last) index += 1;
      else if (currentSession.loop && last >= 0) index = 0;
      else if (direction === 'ended') {
        setIntentPlaying(false);
        setPlaying(false);
        return;
      } else {
        return;
      }
    } else if (index > 0) {
      index -= 1;
    } else if (currentSession.loop && last >= 0) {
      index = last;
    } else {
      return;
    }

    if (index === currentSession.index) return;
    const nextTrack = currentSession.tracks[index];
    if (nextTrack) applyLockScreenMetadata(nextTrack);
    setSession({ ...currentSession, index });
    setIntentPlaying(true);
    setCurrentTime(0);
  }, []);

  const advanceRef = useRef(advance);
  advanceRef.current = advance;

  const playQueue = useCallback(
    (
      tracks: DashboardTrack[],
      start: DashboardTrack,
      options?: PlayQueueOptions,
    ) => {
      if (tracks.length === 0) return;
      const found = indexOfCatalogTrack(tracks, start);
      const index = found >= 0 ? found : 0;
      const starting = tracks[index];
      if (starting) applyLockScreenMetadata(starting);
      setSession((prev) => {
        const loop = options?.loop ?? prev?.loop ?? false;
        const queueEnabled = options?.queueEnabled ?? tracks.length > 1;
        if (prev && samePlaybackQueue(prev.tracks, tracks)) {
          return { ...prev, index, queueEnabled };
        }
        return {
          id: crypto.randomUUID(),
          tracks,
          index,
          loop,
          repeatOne: false,
          queueEnabled,
        };
      });
      setError(null);
      setIntentPlaying(true);
    },
    [],
  );

  const toggle = useCallback(() => {
    const media = audioRef.current;
    if (!media || !sessionRef.current) return;
    if (media.paused) {
      setIntentPlaying(true);
      void media.play().catch(() => {});
    } else {
      setIntentPlaying(false);
      media.pause();
    }
  }, []);

  const stop = useCallback(() => {
    const media = audioRef.current;
    setIntentPlaying(false);
    if (!media) return;
    media.pause();
    try {
      media.currentTime = 0;
    } catch {
      /* ignore */
    }
    setCurrentTime(0);
    setPlaying(false);
  }, []);

  const next = useCallback(() => advanceRef.current(1), []);
  const previous = useCallback(() => advanceRef.current(-1), []);

  const setLoop = useCallback((loop: boolean) => {
    setSession((prev) => (prev && prev.loop !== loop ? { ...prev, loop } : prev));
  }, []);

  const setRepeatOne = useCallback((repeatOne: boolean) => {
    setSession((prev) =>
      prev && prev.repeatOne !== repeatOne ? { ...prev, repeatOne } : prev,
    );
  }, []);

  const path = current?.track_path?.trim() ?? '';

  useEffect(() => {
    const media = audioRef.current;
    if (!media || !path) return;

    let cancelled = false;
    const url = vaultStreamUrl(path);
    let hls: Hls | null = null;

    const destroy = () => {
      if (hls) {
        try {
          hls.detachMedia();
        } catch {
          /* ignore */
        }
        hls.destroy();
        hls = null;
      }
    };

    const tryPlay = () => {
      if (cancelled || !intentRef.current) return;
      void media.play().catch(() => {});
    };

    const onEnded = () => advanceRef.current('ended');
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setCurrentTime(media.currentTime || 0);
    const onDuration = () => {
      const nextDuration = media.duration;
      setDuration(Number.isFinite(nextDuration) ? nextDuration : 0);
    };
    const onError = () => {
      const code = media.error?.code;
      if (code == null || code === 1) return;
      setError('Playback failed. Press play to try again.');
    };

    media.addEventListener('ended', onEnded);
    media.addEventListener('play', onPlay);
    media.addEventListener('pause', onPause);
    media.addEventListener('timeupdate', onTime);
    media.addEventListener('durationchange', onDuration);
    media.addEventListener('error', onError);

    if (media.canPlayType('application/vnd.apple.mpegurl')) {
      media.src = url;
      media.addEventListener('canplay', tryPlay);
    } else if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: false,
        maxBufferHole: 1,
        nudgeOffset: 0.15,
        nudgeMaxRetry: 8,
        highBufferWatchdogPeriod: 1,
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          try {
            hls?.startLoad(-1);
            return;
          } catch {
            /* fall through */
          }
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          try {
            hls?.recoverMediaError();
            return;
          } catch {
            /* fall through */
          }
        }
        setError('Could not play this stream.');
      });
      hls.on(Hls.Events.MANIFEST_PARSED, tryPlay);
      hls.loadSource(url);
      hls.attachMedia(media);
    } else {
      media.src = url;
      media.addEventListener('canplay', tryPlay);
    }

    return () => {
      cancelled = true;
      media.removeEventListener('ended', onEnded);
      media.removeEventListener('play', onPlay);
      media.removeEventListener('pause', onPause);
      media.removeEventListener('timeupdate', onTime);
      media.removeEventListener('durationchange', onDuration);
      media.removeEventListener('error', onError);
      media.removeEventListener('canplay', tryPlay);
      destroy();
    };
  }, [path]);

  useEffect(() => {
    const media = audioRef.current;
    if (!media || !path) return;
    if (intentPlaying) {
      void media.play().catch(() => {});
    } else {
      media.pause();
    }
  }, [intentPlaying, path]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    const media = audioRef.current;

    if (!current) {
      try {
        ms.metadata = null;
        ms.playbackState = 'none';
      } catch {
        /* ignore */
      }
      return;
    }

    applyLockScreenMetadata(current);
    ms.playbackState = playing ? 'playing' : 'paused';

    const syncPosition = () => {
      if (!media || typeof ms.setPositionState !== 'function') return;
      const length = media.duration;
      if (!Number.isFinite(length) || length <= 0) return;
      const position = Math.min(Math.max(0, media.currentTime), length);
      try {
        ms.setPositionState({
          duration: length,
          playbackRate: media.playbackRate || 1,
          position,
        });
      } catch {
        /* Safari throws when the state is invalid */
      }
    };

    ms.setActionHandler?.('play', () => {
      setIntentPlaying(true);
      void media?.play().catch(() => {});
    });
    ms.setActionHandler?.('pause', () => {
      setIntentPlaying(false);
      media?.pause();
    });
    ms.setActionHandler?.('previoustrack', () => {
      advanceRef.current(-1);
    });
    ms.setActionHandler?.('nexttrack', () => {
      advanceRef.current(1);
    });
    ms.setActionHandler?.('seekbackward', (details) => {
      if (!media) return;
      const delta = details.seekOffset ?? 15;
      media.currentTime = Math.max(0, media.currentTime - delta);
      syncPosition();
    });
    ms.setActionHandler?.('seekforward', (details) => {
      if (!media) return;
      const delta = details.seekOffset ?? 15;
      const end = Number.isFinite(media.duration)
        ? media.duration
        : media.currentTime + delta;
      media.currentTime = Math.min(end, media.currentTime + delta);
      syncPosition();
    });
    ms.setActionHandler?.('seekto', (details) => {
      if (!media || details.seekTime == null || !Number.isFinite(details.seekTime)) return;
      const length = media.duration;
      media.currentTime = Number.isFinite(length)
        ? Math.min(Math.max(0, details.seekTime), length)
        : Math.max(0, details.seekTime);
      syncPosition();
    });

    const onPlaying = () => {
      applyLockScreenMetadata(current);
      ms.playbackState = 'playing';
      syncPosition();
    };
    const onPause = () => {
      ms.playbackState = 'paused';
      syncPosition();
    };

    media?.addEventListener('playing', onPlaying);
    media?.addEventListener('pause', onPause);
    media?.addEventListener('timeupdate', syncPosition);
    syncPosition();

    return () => {
      media?.removeEventListener('playing', onPlaying);
      media?.removeEventListener('pause', onPause);
      media?.removeEventListener('timeupdate', syncPosition);
      ms.setActionHandler?.('play', null);
      ms.setActionHandler?.('pause', null);
      ms.setActionHandler?.('previoustrack', null);
      ms.setActionHandler?.('nexttrack', null);
      ms.setActionHandler?.('seekbackward', null);
      ms.setActionHandler?.('seekforward', null);
      ms.setActionHandler?.('seekto', null);
    };
  }, [current, playing]);

  useCatalogListenHeartbeat({
    catalogTrackId: current?.catalog_track_id?.trim(),
    playing,
    trackKey: path,
    allowAnonymousListen: Boolean(
      current?.catalog_track_id?.trim() && current.anonymous_visible === true,
    ),
  });

  useEffect(() => {
    if (!session) return;
    const previous = document.body.style.paddingBottom;
    document.body.style.paddingBottom = '5rem';
    return () => {
      document.body.style.paddingBottom = previous;
    };
  }, [session]);

  const value = useMemo<PlaybackContextValue>(
    () => ({
      session,
      media,
      playing,
      currentTime,
      duration,
      error,
      playQueue,
      toggle,
      stop,
      next,
      previous,
      setLoop,
      setRepeatOne,
    }),
    [
      session,
      media,
      playing,
      currentTime,
      duration,
      error,
      playQueue,
      toggle,
      stop,
      next,
      previous,
      setLoop,
      setRepeatOne,
    ],
  );

  return (
    <PlaybackContext.Provider value={value}>
      {children}
      <audio
        ref={(node) => {
          audioRef.current = node;
          setMedia(node);
        }}
        preload="none"
        className="pointer-events-none absolute h-px w-px opacity-0"
      />
      <PersistentPlayerBar />
    </PlaybackContext.Provider>
  );
}

function PersistentPlayerBar() {
  const playback = usePlayback();
  const [expanded, setExpanded] = useState(false);
  const track = trackAt(playback.session);
  if (!playback.session || !track) return null;

  const progress =
    playback.duration > 0
      ? Math.min(1, playback.currentTime / playback.duration)
      : 0;
  const poster = getTrackPosterUrl(track);
  const canSkip = playback.session.queueEnabled;
  const loopOn = playback.session.loop;

  return (
    <>
      {expanded ? (
        <PersistentPlayerSheet track={track} onClose={() => setExpanded(false)} />
      ) : null}
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-cyan-500/20 bg-zinc-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="h-0.5 bg-white/10">
          <div
            className="h-full bg-[#00f2ff]"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-3 sm:px-4">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            aria-expanded={expanded}
            aria-label={`Open player for ${track.title}`}
            onClick={() => setExpanded(true)}
          >
            {poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={poster}
                alt=""
                className="h-11 w-11 shrink-0 rounded-md object-cover"
              />
            ) : (
              <div className="h-11 w-11 shrink-0 rounded-md bg-zinc-800" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{track.title}</span>
              {playback.error ? (
                <span className="block truncate text-xs text-red-300">{playback.error}</span>
              ) : (
                <span className="block truncate text-xs text-muted-foreground">
                  {playback.playing ? 'Playing' : 'Paused'}
                </span>
              )}
            </span>
          </button>
          <div className="flex shrink-0 items-center gap-1">
            <BarButton
              label="Previous"
              disabled={!canSkip}
              onClick={playback.previous}
            >
              <SkipIcon direction="back" />
            </BarButton>
            <BarButton
              label={playback.playing ? 'Pause' : 'Play'}
              onClick={playback.toggle}
            >
              {playback.playing ? <PauseIcon /> : <PlayIcon />}
            </BarButton>
            <BarButton label="Next" disabled={!canSkip} onClick={playback.next}>
              <SkipIcon direction="forward" />
            </BarButton>
            <BarButton
              label="Loop"
              pressed={loopOn}
              onClick={() => playback.setLoop(!loopOn)}
            >
              <Repeat className="size-4" aria-hidden />
            </BarButton>
          </div>
        </div>
    </div>
    </>
  );
}

function BarButton({
  label,
  disabled,
  pressed,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex size-9 items-center justify-center rounded-full text-[#00f2ff] hover:bg-white/10 disabled:opacity-40 [&_svg]:size-4 ${pressed === false ? 'opacity-45' : ''}`}
    >
      {children}
    </button>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  );
}

function SkipIcon({ direction }: { direction: 'back' | 'forward' }) {
  const path =
    direction === 'back' ? 'M6 6h2v12H6zm3.5 6 8.5 6V6z' : 'M6 18l8.5-6L6 6v12zM16 6h2v12h-2z';
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
      <path d={path} />
    </svg>
  );
}
