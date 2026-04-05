'use client';

import Hls from 'hls.js';
import { Pause, Play } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import WaveSurfer from 'wavesurfer.js';

import {
  downsamplePeaksForDisplay,
  parseWaveformJson,
  type ParsedWaveform,
} from '@/lib/waveform-json';
import { fetchVaultSignedUrl } from '@/lib/vault-signed-url-client';
import { resolvePublicAssetsUrl } from '@/lib/storage';
import { vaultStreamUrl } from '@/lib/vault-stream';
import { useCatalogListenHeartbeat } from '@/hooks/use-catalog-listen-heartbeat';

export type VaultTrackData = {
  /** Fallback still when no vault background video */
  bg_image_url: string;
  content_type: 'video' | 'audio';
  /** Vault bucket path to HLS entry (e.g. `folder/index.m3u8`) — streamed via `/api/vault/stream/...` */
  track_path: string;
  thumbnail_url?: string;
  title?: string;
  description_en?: string;
  description_es?: string;
  /** Public `assets` key or full URL to `waveform.json` */
  waveform_json_path?: string;
  waveform_json_url?: string;
  /** Vault object key for `waveform.json` — signed URL fetched at runtime (takes precedence over public paths). */
  waveform_json_vault_path?: string;
  /** Vault object key for looping background MP4 (4K); signed URL + top hero video. HLS attaches to `<audio>`. */
  vault_background_video_path?: string;
  /**
   * Square-ish cover for lock screen / Control Center / CarPlay (HTTPS or same-origin).
   * Not derived from `bg_image_url` — that image is often a blurred stock backdrop (e.g. Picsum).
   */
  lock_screen_art_url?: string;
  /** When set, listen time is reported for catalog rating eligibility (UUID from `api.tracks`). */
  catalog_track_id?: string;
};

type VaultPlayerProps = {
  trackData: VaultTrackData;
  variant?: 'fullscreen' | 'embedded';
};

type WaveformLoadState = ParsedWaveform | null | 'loading' | 'error';

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function isParsedWaveform(w: WaveformLoadState): w is ParsedWaveform {
  return w !== null && w !== 'loading' && w !== 'error';
}

function resolveAbsoluteMediaUrl(href: string): string {
  try {
    return new URL(href.trim(), window.location.href).href;
  } catch {
    return href.trim();
  }
}

/**
 * Safari often falls back to the largest on-page `<img>` for lock-screen art when
 * `MediaMetadata` artwork is missing or fails to load. Default dashboard bg uses
 * Lorem Picsum — that URL must not be a real `<img src>` or iOS shows it as “album art”.
 */
function isStockPhotoBackdropUrl(url: string): boolean {
  return /picsum\.photos/i.test(url);
}

/** Inlined at build time; change requires redeploy on Vercel etc. */
const MEDIA_SESSION_ART_ENV =
  typeof process.env.NEXT_PUBLIC_MEDIA_SESSION_ART_URL === 'string'
    ? process.env.NEXT_PUBLIC_MEDIA_SESSION_ART_URL.trim()
    : '';

function buildPlaceholderPeaks(length: number): Float32Array {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / Math.max(1, length - 1);
    const w =
      Math.sin(t * Math.PI * 14) * 0.22 +
      Math.sin(t * Math.PI * 27) * 0.14 +
      Math.sin(t * Math.PI * 5) * 0.18;
    const envelope = Math.sin(t * Math.PI) * 0.85 + 0.15;
    out[i] = Math.min(1, Math.max(0.06, Math.abs(w) * envelope));
  }
  return out;
}

const WAVEFORM_DISPLAY_BINS = 2048;

/** Neon Cyan → Violet (Vault) */
const VAULT_WAVESURFER = {
  height: 104,
  waveColor: ['#00f2ff', '#7b2eff'] as [string, string],
  progressColor: 'rgba(123, 46, 255, 0.88)',
  cursorColor: '#e0e7ff',
  cursorWidth: 2,
  barHeight: 0.9,
};

const PLAY_BTN_PREMIUM =
  'rounded-full border border-white/10 bg-zinc-900/90 text-[#00f2ff] shadow-[0_8px_32px_rgba(0,0,0,0.45)] ring-1 ring-white/5 transition hover:border-[#00f2ff]/35 hover:bg-zinc-800/95 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00f2ff]/50';

export function VaultPlayer({
  trackData,
  variant = 'fullscreen',
}: VaultPlayerProps) {
  const {
    bg_image_url,
    content_type,
    track_path,
    thumbnail_url,
    lock_screen_art_url,
    title,
    description_en,
    description_es,
    waveform_json_path,
    waveform_json_url,
    waveform_json_vault_path,
    vault_background_video_path,
    catalog_track_id,
  } = trackData;

  const vaultWfTrim = waveform_json_vault_path?.trim();
  const pathTrim = waveform_json_path?.trim();
  const urlTrim = waveform_json_url?.trim();
  const wantsWaveformJson = Boolean(vaultWfTrim || pathTrim || urlTrim);

  const cinematic = Boolean(vault_background_video_path?.trim());
  /** HLS is attached to `<audio>` for vault cinematic layout and for audio-only streams. */
  const hlsOnAudio = cinematic || content_type === 'audio';

  const [streamError, setStreamError] = useState<{
    path: string;
    message: string;
  } | null>(null);
  const loadError =
    streamError?.path === track_path ? streamError.message : null;

  const [lang, setLang] = useState<'en' | 'es'>('en');

  const [waveformState, setWaveformState] = useState<WaveformLoadState>(() =>
    wantsWaveformJson ? 'loading' : null,
  );

  const [vaultBgVideoError, setVaultBgVideoError] = useState(false);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);

  /** Same-origin proxy → signed Supabase URL (matches HLS); avoids cross-origin `<video src>` issues. */
  const vaultBgVideoSrc = useMemo(() => {
    if (!cinematic || !vault_background_video_path?.trim()) return null;
    return vaultStreamUrl(vault_background_video_path.trim());
  }, [cinematic, vault_background_video_path, track_path]);

  useEffect(() => {
    if (!wantsWaveformJson) {
      setWaveformState(null);
      return;
    }
    setWaveformState('loading');
    let cancelled = false;

    const runPublic = (jsonUrl: string) =>
      fetch(jsonUrl)
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          return r.json() as unknown;
        })
        .then((raw) => {
          const parsed = parseWaveformJson(raw);
          if (!cancelled) setWaveformState(parsed ?? 'error');
        });

    if (vaultWfTrim) {
      void fetchVaultSignedUrl(vaultWfTrim)
        .then((signedUrl) => fetch(signedUrl))
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          return r.json() as unknown;
        })
        .then((raw) => {
          const parsed = parseWaveformJson(raw);
          if (!cancelled) setWaveformState(parsed ?? 'error');
        })
        .catch(() => {
          if (!cancelled) setWaveformState('error');
        });
      return () => {
        cancelled = true;
      };
    }

    let jsonUrl: string;
    try {
      jsonUrl = resolvePublicAssetsUrl(urlTrim ?? pathTrim!);
    } catch {
      setWaveformState('error');
      return () => {
        cancelled = true;
      };
    }
    void runPublic(jsonUrl).catch(() => {
      if (!cancelled) setWaveformState('error');
    });
    return () => {
      cancelled = true;
    };
  }, [
    wantsWaveformJson,
    vaultWfTrim,
    pathTrim,
    urlTrim,
    track_path,
  ]);

  useEffect(() => {
    if (!cinematic) setVaultBgVideoError(false);
  }, [cinematic, track_path]);

  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const waveformContainerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const recoveringRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [readyForPath, setReadyForPath] = useState<string | null>(null);
  const mediaReady = readyForPath === track_path;

  useCatalogListenHeartbeat({
    catalogTrackId: catalog_track_id?.trim(),
    playing,
    trackKey: track_path,
  });

  const playUrl = useMemo(() => vaultStreamUrl(track_path), [track_path]);

  /** Client navigation can reuse this instance — reset so HLS/WaveSurfer do not keep stale metadata. */
  useEffect(() => {
    setReadyForPath(null);
    setDuration(0);
    setCurrentTime(0);
    setPlaying(false);
    setStreamError(null);
    recoveringRef.current = false;
  }, [track_path]);

  /** Background loop: paused on first frame until music plays; stays in sync with audio. */
  useEffect(() => {
    const el = bgVideoRef.current;
    if (!el || !vaultBgVideoSrc || !cinematic) return;
    setVaultBgVideoError(false);
    el.load();
    el.pause();
    el.currentTime = 0;
  }, [vaultBgVideoSrc, cinematic]);

  useEffect(() => {
    const el = bgVideoRef.current;
    if (!el || !cinematic || !vaultBgVideoSrc) return;
    if (playing) {
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [playing, cinematic, vaultBgVideoSrc]);

  useEffect(() => {
    const container = waveformContainerRef.current;
    const media = mediaRef.current;
    if (!container || !media || !mediaReady || waveformState === 'loading') {
      return;
    }
    if (!Number.isFinite(duration) || duration <= 0) {
      return;
    }

    const useJson = isParsedWaveform(waveformState);
    const peakChannels = useJson
      ? downsamplePeaksForDisplay(waveformState.peaks, WAVEFORM_DISPLAY_BINS)
      : [buildPlaceholderPeaks(WAVEFORM_DISPLAY_BINS)];
    /** Prefer media duration: JSON peaks are often a few seconds short of the real HLS length. */
    const jsonDur =
      useJson && waveformState.duration > 0 ? waveformState.duration : 0;
    const waveDuration = jsonDur > 0 ? Math.max(duration, jsonDur) : duration;

    const ws = WaveSurfer.create({
      container,
      backend: 'MediaElement',
      height: VAULT_WAVESURFER.height,
      waveColor: VAULT_WAVESURFER.waveColor,
      progressColor: VAULT_WAVESURFER.progressColor,
      cursorColor: VAULT_WAVESURFER.cursorColor,
      cursorWidth: VAULT_WAVESURFER.cursorWidth,
      peaks: peakChannels,
      duration: waveDuration,
      interact: true,
      dragToSeek: { debounceTime: 0 },
      normalize: true,
      barHeight: VAULT_WAVESURFER.barHeight,
      fillParent: true,
    });

    let cancelled = false;

    const attachHlsMedia = () => {
      if (cancelled) return;
      try {
        ws.setMediaElement(media);
      } catch {
        /* already wired */
      }
    };

    ws.on('ready', attachHlsMedia, { once: true });
    if (ws.getDecodedData()) {
      queueMicrotask(attachHlsMedia);
    }

    return () => {
      cancelled = true;
      ws.destroy();
    };
    // Use floored duration so HLS `durationchange` ticks do not destroy/recreate WaveSurfer mid-playback.
  }, [
    mediaReady,
    duration > 0 ? Math.floor(duration) : 0,
    track_path,
    playUrl,
    waveformState,
  ]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media || !playUrl) return;

    const destroyHls = () => {
      if (hlsRef.current) {
        try {
          hlsRef.current.detachMedia();
        } catch {
          /* ignore */
        }
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };

    destroyHls();
    media.pause();
    media.removeAttribute('src');
    try {
      media.load();
    } catch {
      /* ignore */
    }

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
      // Safari uses native HLS above; this path is Chrome/Firefox/Edge (MSE). Chrome is
      // much more reliable with the main-thread transmuxer — the worker + MSE path is a
      // common source of stalls and broken replay after `ended` on `<audio>`.
      const hls = new Hls({
        enableWorker: false,
        // Wider hole tolerance + more gap nudges — small discontinuities at segment joins are common on MSE.
        maxBufferHole: 1,
        nudgeOffset: 0.15,
        nudgeMaxRetry: 8,
        highBufferWatchdogPeriod: 1,
      });
      hlsRef.current = hls;
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          try {
            hls.startLoad(-1);
            return;
          } catch {
            /* fall through to user-facing error */
          }
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          if (!recoveringRef.current) {
            recoveringRef.current = true;
            try {
              hls.recoverMediaError();
              window.setTimeout(() => {
                recoveringRef.current = false;
              }, 1200);
              return;
            } catch {
              recoveringRef.current = false;
            }
          } else {
            return;
          }
        }
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
    const onEnded = () => {
      setPlaying(false);
      const d = media.duration;
      if (Number.isFinite(d) && d > 0) {
        setCurrentTime(d);
      }
    };

    media.addEventListener('timeupdate', onTime);
    media.addEventListener('loadedmetadata', onDuration);
    media.addEventListener('durationchange', onDuration);
    media.addEventListener('play', onPlay);
    media.addEventListener('pause', onPause);
    media.addEventListener('ended', onEnded);
    media.addEventListener('error', onMediaError);

    return () => {
      media.removeEventListener('timeupdate', onTime);
      media.removeEventListener('loadedmetadata', onDuration);
      media.removeEventListener('durationchange', onDuration);
      media.removeEventListener('play', onPlay);
      media.removeEventListener('pause', onPause);
      media.removeEventListener('ended', onEnded);
      media.removeEventListener('error', onMediaError);
      destroyHls();
      media.pause();
      media.removeAttribute('src');
      media.load();
    };
  }, [playUrl, hlsOnAudio, track_path]);

  const playMedia = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    const d = media.duration;
    const nearEnd =
      Number.isFinite(d) && d > 0 && media.currentTime >= d - 0.25;
    const atEnd = media.ended || nearEnd;

    if (atEnd) {
      const hls = hlsRef.current;
      if (hls) {
        try {
          hls.startLoad(0);
        } catch {
          /* ignore */
        }
      }
      media.currentTime = 0;
      const play = () => {
        void media.play().catch(() => {});
      };
      const onSeeked = () => {
        clearTimeout(fallback);
        play();
      };
      media.addEventListener('seeked', onSeeked, { once: true });
      const fallback = window.setTimeout(() => {
        media.removeEventListener('seeked', onSeeked);
        play();
      }, 300);
      return;
    }

    void media.play().catch(() => {});
  }, []);

  const pauseMedia = useCallback(() => {
    mediaRef.current?.pause();
  }, []);

  const togglePlay = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    if (media.paused) playMedia();
    else pauseMedia();
  }, [playMedia, pauseMedia]);

  const lockScreenTitle = title?.trim() || 'Track';
  const lockScreenArtworkHref = useMemo(() => {
    const raw =
      MEDIA_SESSION_ART_ENV ||
      lock_screen_art_url?.trim() ||
      thumbnail_url?.trim() ||
      '';
    if (!raw) return null;
    if (typeof window === 'undefined') return raw;
    return resolveAbsoluteMediaUrl(raw);
  }, [lock_screen_art_url, thumbnail_url]);

  /** Lock screen / Control Center / CarPlay — tie remote controls to HLS element, not the muted hero video. */
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const media = mediaRef.current;
    if (!media || !mediaReady) return;

    const ms = navigator.mediaSession;

    const syncPositionState = () => {
      if (typeof ms.setPositionState !== 'function') return;
      const d = media.duration;
      if (!Number.isFinite(d) || d <= 0) return;
      const pos = Math.min(Math.max(0, media.currentTime), d);
      try {
        ms.setPositionState({
          duration: d,
          playbackRate: media.playbackRate || 1,
          position: pos,
        });
      } catch {
        /* Safari throws if state is invalid */
      }
    };

    const applyMetadata = () => {
      try {
        ms.metadata = new MediaMetadata({
          title: lockScreenTitle,
          artist: '',
          artwork: lockScreenArtworkHref
            ? [
                { src: lockScreenArtworkHref, sizes: '512x512' },
                { src: lockScreenArtworkHref, sizes: '256x256' },
              ]
            : [],
        });
      } catch {
        try {
          ms.metadata = new MediaMetadata({
            title: lockScreenTitle,
            artist: '',
          });
        } catch {
          /* ignore */
        }
      }
    };

    applyMetadata();
    media.addEventListener('playing', applyMetadata, { once: true });

    const skipSeconds = 15;

    ms.setActionHandler?.('play', () => {
      playMedia();
    });
    ms.setActionHandler?.('pause', () => {
      pauseMedia();
    });
    ms.setActionHandler?.('seekbackward', (e) => {
      const delta = e.seekOffset ?? skipSeconds;
      media.currentTime = Math.max(0, media.currentTime - delta);
      syncPositionState();
    });
    ms.setActionHandler?.('seekforward', (e) => {
      const delta = e.seekOffset ?? skipSeconds;
      const end = Number.isFinite(media.duration) ? media.duration : media.currentTime + delta;
      media.currentTime = Math.min(end, media.currentTime + delta);
      syncPositionState();
    });
    ms.setActionHandler?.('seekto', (e) => {
      if (e.seekTime == null || !Number.isFinite(e.seekTime)) return;
      const d = media.duration;
      const t = Number.isFinite(d)
        ? Math.min(Math.max(0, e.seekTime), d)
        : Math.max(0, e.seekTime);
      media.currentTime = t;
      syncPositionState();
    });

    const onTime = () => syncPositionState();
    media.addEventListener('timeupdate', onTime);
    media.addEventListener('durationchange', syncPositionState);
    media.addEventListener('ratechange', syncPositionState);
    syncPositionState();

    return () => {
      media.removeEventListener('timeupdate', onTime);
      media.removeEventListener('durationchange', syncPositionState);
      media.removeEventListener('ratechange', syncPositionState);
      ms.setActionHandler?.('play', null);
      ms.setActionHandler?.('pause', null);
      ms.setActionHandler?.('seekbackward', null);
      ms.setActionHandler?.('seekforward', null);
      ms.setActionHandler?.('seekto', null);
      ms.metadata = null;
    };
  }, [
    mediaReady,
    track_path,
    lockScreenTitle,
    lockScreenArtworkHref,
    playMedia,
    pauseMedia,
  ]);

  const description =
    lang === 'en' ? description_en ?? description_es : description_es ?? description_en;

  const hasBothLang =
    Boolean(description_en?.trim()) && Boolean(description_es?.trim());

  const embedded = variant === 'embedded';
  const layer = embedded ? 'absolute' : 'fixed';
  const shellMin = embedded
    ? 'min-h-[min(480px,82dvh)] sm:min-h-[min(520px,78dvh)] lg:min-h-[min(560px,80dvh)]'
    : 'min-h-[100dvh]';

  const waveformShellClass =
    'min-h-[96px] w-full overflow-hidden rounded-xl border border-[#00f2ff]/20 bg-black/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_28px_-8px_rgba(0,242,255,0.15)]';

  const playBtnClass = `${PLAY_BTN_PREMIUM} flex shrink-0 items-center justify-center`;
  /** Keeps play/wave row from shifting when loading copy mounts/unmounts. */
  const streamStatusRowClass =
    'flex min-h-[1.375rem] items-center justify-center sm:justify-start';

  const showBackdropImage = !cinematic;

  return (
    <div
      className={`relative w-full overflow-hidden ${shellMin} ${embedded ? 'rounded-2xl ring-1 ring-[#00f2ff]/15' : ''} ${cinematic ? 'bg-zinc-950' : ''}`}
    >
      {showBackdropImage ? (
        <>
          <div className={`pointer-events-none ${layer} inset-0 z-0`}>
            {isStockPhotoBackdropUrl(bg_image_url) ? (
              <div
                className="h-full w-full bg-gradient-to-br from-zinc-900 via-zinc-950 to-black"
                aria-hidden
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={bg_image_url}
                alt=""
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div
            className={`${layer} inset-0 z-10 backdrop-blur-3xl bg-black/70`}
            aria-hidden
          />
        </>
      ) : (
        <div
          className={`pointer-events-none ${layer} inset-0 z-0 bg-zinc-950`}
          aria-hidden
        />
      )}

      <div
        className={`relative z-20 flex ${shellMin} flex-col items-center justify-center ${embedded ? 'p-3 sm:p-4 lg:p-6' : 'p-4 sm:p-8'}`}
      >
        <div
          className={`w-full border border-[#00f2ff]/20 bg-zinc-950/80 shadow-[0_0_48px_-12px_rgba(0,242,255,0.12)] backdrop-blur-md ${
            embedded
              ? 'max-w-none rounded-xl p-3 sm:rounded-2xl sm:p-5 lg:p-8'
              : 'max-w-3xl rounded-2xl p-4 sm:p-8'
          }`}
          style={{
            boxShadow:
              '0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(0,242,255,0.08)',
          }}
        >
          {loadError ? (
            <p className="mb-4 text-center text-sm text-red-300">{loadError}</p>
          ) : null}
          {wantsWaveformJson && waveformState === 'error' ? (
            <p className="mb-3 text-center text-xs text-amber-200/90">
              Waveform JSON failed to load — showing placeholder shape.
            </p>
          ) : null}
          {vaultBgVideoError ? (
            <p className="mb-3 text-center text-xs text-amber-200/90">
              Background video could not be loaded from the vault.
            </p>
          ) : null}

          <div
            className="select-none"
            onContextMenu={(e) => e.preventDefault()}
          >
            {cinematic ? (
              <div className="space-y-4">
                <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black ring-1 ring-white/5">
                  {vaultBgVideoSrc ? (
                    <video
                      ref={bgVideoRef}
                      key={`${track_path}:${vaultBgVideoSrc}`}
                      className="vault-hero-video pointer-events-none absolute inset-0 z-0 h-full w-full object-cover object-center"
                      src={vaultBgVideoSrc}
                      muted
                      loop
                      playsInline
                      preload="auto"
                      disableRemotePlayback
                      onError={() => setVaultBgVideoError(true)}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-sm text-zinc-400">
                      {vaultBgVideoError
                        ? 'Video unavailable'
                        : 'Loading background…'}
                    </div>
                  )}
                  <div
                    className="pointer-events-none absolute inset-0 z-10 bg-black/45"
                    aria-hidden
                  />
                </div>

                <audio
                  key={`hls-audio-${track_path}`}
                  ref={(el) => {
                    mediaRef.current = el;
                  }}
                  className="sr-only"
                  playsInline
                  preload="metadata"
                  controls={false}
                />

                <div className={`${streamStatusRowClass} text-sm text-zinc-400`} aria-live="polite">
                  {!mediaReady ? <p>Loading stream…</p> : null}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className={`${playBtnClass} h-12 w-12`}
                    aria-label={playing ? 'Pause' : 'Play'}
                  >
                    {playing ? (
                      <Pause className="h-5 w-5" fill="currentColor" />
                    ) : (
                      <Play className="h-5 w-5 pl-0.5" fill="currentColor" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1 space-y-2">
                    {waveformState === 'loading' ? (
                      <div
                        className={`${waveformShellClass} flex items-center justify-center text-xs text-[#00f2ff]/70`}
                      >
                        Loading waveform…
                      </div>
                    ) : (
                      <div
                        key={`wf-${track_path}`}
                        ref={waveformContainerRef}
                        className={waveformShellClass}
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    )}
                    <div className="flex justify-between text-xs tabular-nums text-zinc-400">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : content_type === 'video' ? (
              <div className="space-y-4">
                <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-[#00f2ff]/15 bg-black shadow-[0_0_32px_-10px_rgba(123,46,255,0.15)] ring-1 ring-white/5">
                  <video
                    key={`hls-video-${track_path}`}
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
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm text-zinc-300">
                      Loading stream…
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className={`${playBtnClass} h-12 w-12`}
                    aria-label={playing ? 'Pause' : 'Play'}
                  >
                    {playing ? (
                      <Pause className="h-5 w-5" fill="currentColor" />
                    ) : (
                      <Play className="h-5 w-5 pl-0.5" fill="currentColor" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1 space-y-2">
                    {waveformState === 'loading' ? (
                      <div
                        className={`${waveformShellClass} flex items-center justify-center text-xs text-[#00f2ff]/70`}
                      >
                        Loading waveform…
                      </div>
                    ) : (
                      <div
                        key={`wf-${track_path}`}
                        ref={waveformContainerRef}
                        className={waveformShellClass}
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    )}
                    <div className="flex justify-between text-xs tabular-nums text-zinc-400">
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
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#00f2ff]/15 via-[#7b2eff]/12 to-transparent ring-2 ring-[#00f2ff]/25" />
                    {thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbnail_url}
                        alt=""
                        draggable={false}
                        className="relative z-10 h-[88%] w-[88%] rounded-full object-cover shadow-2xl ring-4 ring-black/50"
                      />
                    ) : (
                      <div className="relative z-10 flex h-[88%] w-[88%] items-center justify-center rounded-full bg-zinc-900 text-4xl text-[#00f2ff]/40 ring-4 ring-black/50">
                        ♪
                      </div>
                    )}
                    <div className="absolute left-1/2 top-1/2 z-20 h-full w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-950 shadow-lg ring-1 ring-[#7b2eff]/30" />
                  </div>

                  <audio
                    key={`hls-audio-vinyl-${track_path}`}
                    ref={(el) => {
                      mediaRef.current = el;
                    }}
                    className="sr-only"
                    playsInline
                    preload="metadata"
                    controls={false}
                  />

                  <div
                    className={`${streamStatusRowClass} text-sm text-zinc-400`}
                    aria-live="polite"
                  >
                    {!mediaReady ? <p>Loading stream…</p> : null}
                  </div>

                  <div
                    className={`w-full space-y-4 ${embedded ? 'max-w-none' : 'max-w-md'}`}
                  >
                    {waveformState === 'loading' ? (
                      <div
                        className={`${waveformShellClass} flex items-center justify-center text-xs text-[#00f2ff]/70`}
                      >
                        Loading waveform…
                      </div>
                    ) : (
                      <div
                        key={`wf-${track_path}`}
                        ref={waveformContainerRef}
                        className={waveformShellClass}
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    )}
                    <div className="flex items-center justify-center gap-4">
                      <button
                        type="button"
                        onClick={togglePlay}
                        className={`${playBtnClass} h-14 w-14`}
                        aria-label={playing ? 'Pause' : 'Play'}
                      >
                        {playing ? (
                          <Pause className="h-7 w-7" fill="currentColor" />
                        ) : (
                          <Play className="h-7 w-7 pl-1" fill="currentColor" />
                        )}
                      </button>
                      <div className="text-sm tabular-nums text-zinc-300">
                        <span>{formatTime(currentTime)}</span>
                        <span className="mx-1 text-[#7b2eff]/50">/</span>
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
                <h1 className="text-center text-xl font-semibold tracking-tight text-white drop-shadow-[0_0_18px_rgba(0,242,255,0.2)] sm:text-2xl">
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
                            ? 'bg-[#00f2ff]/20 text-[#00f2ff] ring-1 ring-[#00f2ff]/40'
                            : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                        }`}
                      >
                        EN
                      </button>
                      <button
                        type="button"
                        onClick={() => setLang('es')}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                          lang === 'es'
                            ? 'bg-[#7b2eff]/25 text-violet-200 ring-1 ring-[#7b2eff]/40'
                            : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                        }`}
                      >
                        ES
                      </button>
                    </div>
                  ) : null}
                  {description ? (
                    <p className="text-center text-sm leading-relaxed text-zinc-400 sm:text-base">
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
