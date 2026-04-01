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
import { resolvePublicAssetsUrl } from '@/lib/storage';
import { vaultStreamUrl } from '@/lib/vault-stream';

export type VaultTrackData = {
  bg_image_url: string;
  content_type: 'video' | 'audio';
  /** Vault bucket path to HLS entry (e.g. `folder/index.m3u8`) — streamed via `/api/vault/stream/...` */
  track_path: string;
  thumbnail_url?: string;
  title?: string;
  description_en?: string;
  description_es?: string;
  /** Public `assets` key or full `https://...` URL to `waveform.json` (peaks + optional duration) */
  waveform_json_path?: string;
  /** Same as path; takes precedence when both are set */
  waveform_json_url?: string;
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

/** Fallback when no JSON or parse fails — must match WaveSurfer peak range */
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

/** ~2k bins: matches placeholder density; avoids max-pooling 90k+ samples into solid blocks. */
const WAVEFORM_DISPLAY_BINS = 2048;

const VAULT_WAVESURFER = {
  height: 104,
  /** cyan → fuchsia (mirror line fill, no bars — reads better for pre-baked peaks) */
  waveColor: ['#22d3ee', '#d946ef'] as [string, string],
  progressColor: 'rgba(244, 114, 182, 0.92)',
  cursorColor: '#ecfeff',
  cursorWidth: 2,
  /** Slight headroom so the mirrored silhouette does not clip the shell */
  barHeight: 0.9,
};

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
    waveform_json_path,
    waveform_json_url,
  } = trackData;

  const [streamError, setStreamError] = useState<{
    path: string;
    message: string;
  } | null>(null);
  const loadError =
    streamError?.path === track_path ? streamError.message : null;

  const [lang, setLang] = useState<'en' | 'es'>('en');

  const pathTrim = waveform_json_path?.trim();
  const urlTrim = waveform_json_url?.trim();
  const wantsWaveformJson = Boolean(pathTrim || urlTrim);

  const [waveformState, setWaveformState] = useState<WaveformLoadState>(() =>
    wantsWaveformJson ? 'loading' : null,
  );

  useEffect(() => {
    if (!wantsWaveformJson) {
      setWaveformState(null);
      return;
    }
    setWaveformState('loading');
    let cancelled = false;
    let jsonUrl: string;
    try {
      jsonUrl = resolvePublicAssetsUrl(urlTrim ?? pathTrim!);
    } catch {
      setWaveformState('error');
      return;
    }
    void fetch(jsonUrl)
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
  }, [wantsWaveformJson, pathTrim, urlTrim, track_path]);

  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const waveformContainerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [readyForPath, setReadyForPath] = useState<string | null>(null);
  const mediaReady = readyForPath === track_path;

  const playUrl = useMemo(() => vaultStreamUrl(track_path), [track_path]);

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
    const waveDuration =
      useJson && waveformState.duration > 0 ? waveformState.duration : duration;

    const ws = WaveSurfer.create({
      container,
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
        /* setMediaElement can throw if graph already wired */
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
  }, [
    mediaReady,
    duration,
    track_path,
    playUrl,
    waveformState,
  ]);

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

  const waveformShellClass =
    'min-h-[96px] w-full overflow-hidden rounded-xl border border-cyan-400/25 bg-black/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_28px_-8px_rgba(34,211,238,0.25)]';

  const playButtonClass =
    'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-cyan-500 text-zinc-950 shadow-[0_0_24px_-4px_rgba(34,211,238,0.65)] ring-2 ring-cyan-300/40 transition hover:from-cyan-300 hover:to-cyan-400';

  return (
    <div
      className={`relative w-full overflow-hidden ${shellMin} ${embedded ? 'rounded-2xl ring-1 ring-cyan-500/20' : ''}`}
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
        className={`${layer} inset-0 z-10 backdrop-blur-3xl bg-black/70`}
        aria-hidden
      />

      <div
        className={`relative z-20 flex ${shellMin} flex-col items-center justify-center p-4 sm:p-8`}
      >
        <div
          className="w-full max-w-3xl rounded-2xl border border-cyan-500/30 bg-zinc-950/75 p-4 shadow-[0_0_48px_-12px_rgba(34,211,238,0.28)] backdrop-blur-md sm:p-8"
          style={{
            boxShadow:
              '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(34,211,238,0.12)',
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

          <div
            className="select-none"
            onContextMenu={(e) => e.preventDefault()}
          >
            {content_type === 'video' ? (
              <div className="space-y-4">
                <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-cyan-500/20 bg-black shadow-[0_0_32px_-10px_rgba(168,85,247,0.2)] ring-1 ring-white/5">
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
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm text-cyan-100/80">
                      Loading stream…
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className={`${playButtonClass} h-12 w-12`}
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
                        className={`${waveformShellClass} flex items-center justify-center text-xs text-cyan-200/70`}
                      >
                        Loading waveform…
                      </div>
                    ) : (
                      <div
                        ref={waveformContainerRef}
                        className={waveformShellClass}
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    )}
                    <div className="flex justify-between text-xs tabular-nums text-cyan-100/75">
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
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/20 via-fuchsia-500/15 to-transparent ring-2 ring-cyan-400/30" />
                    {thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbnail_url}
                        alt=""
                        draggable={false}
                        className="relative z-10 h-[88%] w-[88%] rounded-full object-cover shadow-2xl ring-4 ring-black/50"
                      />
                    ) : (
                      <div className="relative z-10 flex h-[88%] w-[88%] items-center justify-center rounded-full bg-zinc-900 text-4xl text-cyan-500/50 ring-4 ring-black/50">
                        ♪
                      </div>
                    )}
                    <div className="absolute left-1/2 top-1/2 z-20 h-full w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-950 shadow-lg ring-1 ring-cyan-500/30" />
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
                    <p className="text-sm text-cyan-100/70">Loading stream…</p>
                  ) : null}

                  <div className="w-full max-w-md space-y-4">
                    {waveformState === 'loading' ? (
                      <div
                        className={`${waveformShellClass} flex items-center justify-center text-xs text-cyan-200/70`}
                      >
                        Loading waveform…
                      </div>
                    ) : (
                      <div
                        ref={waveformContainerRef}
                        className={waveformShellClass}
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    )}
                    <div className="flex items-center justify-center gap-4">
                      <button
                        type="button"
                        onClick={togglePlay}
                        className={`${playButtonClass} h-14 w-14`}
                        aria-label={playing ? 'Pause' : 'Play'}
                      >
                        {playing ? (
                          <Pause className="h-7 w-7" fill="currentColor" />
                        ) : (
                          <Play className="h-7 w-7 pl-1" fill="currentColor" />
                        )}
                      </button>
                      <div className="text-sm tabular-nums text-cyan-100/80">
                        <span>{formatTime(currentTime)}</span>
                        <span className="mx-1 text-fuchsia-400/50">/</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {(title || description) && (
            <div className="mt-8 space-y-3 border-t border-cyan-500/20 pt-6">
              {title ? (
                <h1 className="text-center text-xl font-semibold tracking-tight text-white drop-shadow-[0_0_18px_rgba(34,211,238,0.35)] sm:text-2xl">
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
                            ? 'bg-cyan-400 text-zinc-950 shadow-[0_0_16px_-4px_rgba(34,211,238,0.6)]'
                            : 'bg-white/10 text-cyan-100/80 hover:bg-white/15'
                        }`}
                      >
                        EN
                      </button>
                      <button
                        type="button"
                        onClick={() => setLang('es')}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                          lang === 'es'
                            ? 'bg-fuchsia-400 text-zinc-950 shadow-[0_0_16px_-4px_rgba(217,70,239,0.5)]'
                            : 'bg-white/10 text-cyan-100/80 hover:bg-white/15'
                        }`}
                      >
                        ES
                      </button>
                    </div>
                  ) : null}
                  {description ? (
                    <p className="text-center text-sm leading-relaxed text-zinc-200/90 sm:text-base">
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
