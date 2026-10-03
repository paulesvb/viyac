'use client';

import { ChevronDown, Repeat } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

import { LyricsDisplay } from '@/components/LyricsDisplay';
import { usePlayback } from '@/components/persistent-playback/playback-context';
import type { DashboardTrack } from '@/lib/dashboard-track-types';
import { toVaultTrackData } from '@/lib/dashboard-tracks';
import { resolvePublicAssetsUrl } from '@/lib/storage';
import { getTrackPosterUrl } from '@/lib/track-poster-url';
import { vaultStreamUrl } from '@/lib/vault-stream';
import {
  downsamplePeaksForDisplay,
  parseWaveformJson,
  type ParsedWaveform,
} from '@/lib/waveform-json';

const WAVEFORM_BINS = 2048;

type Props = {
  track: DashboardTrack;
  onClose: () => void;
};

export function PersistentPlayerSheet({ track, onClose }: Props) {
  const playback = usePlayback();
  const poster = getTrackPosterUrl(track);
  const canSkip = playback.session?.queueEnabled ?? false;

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950">
      <div className="flex flex-col items-center pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="text-xs uppercase tracking-widest text-cyan-300/80">Now playing</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="mt-1 inline-flex size-9 items-center justify-center rounded-full text-[#00f2ff] hover:bg-white/10"
        >
          <ChevronDown className="size-5" aria-hidden />
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 overflow-y-auto px-4 py-6 pb-28">
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt=""
            className="mx-auto aspect-square w-full max-w-xs rounded-xl object-cover shadow-[0_0_40px_-12px_rgba(34,211,238,0.35)]"
          />
        ) : (
          <div className="mx-auto aspect-square w-full max-w-xs rounded-xl bg-zinc-800" />
        )}

        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight">{track.title}</h2>
          {track.album_title ? (
            <p className="mt-1 text-sm text-muted-foreground">{track.album_title}</p>
          ) : null}
        </div>

        <PlayerWaveform track={track} media={playback.media} duration={playback.duration} />

        <p className="text-center text-xs tabular-nums text-muted-foreground">
          {formatTime(playback.currentTime)} / {formatTime(playback.duration)}
        </p>

        {playback.error ? (
          <p className="text-center text-sm text-red-300">{playback.error}</p>
        ) : null}

        <div className="flex w-full items-center justify-center gap-3">
          <SheetButton label="Previous" disabled={!canSkip} onClick={playback.previous}>
            <SkipGlyph direction="back" />
          </SheetButton>
          <SheetButton
            label={playback.playing ? 'Pause' : 'Play'}
            onClick={playback.toggle}
          >
            {playback.playing ? <PauseGlyph /> : <PlayGlyph />}
          </SheetButton>
          <SheetButton label="Next" disabled={!canSkip} onClick={playback.next}>
            <SkipGlyph direction="forward" />
          </SheetButton>
          <SheetButton
            label="Loop"
            pressed={playback.session?.loop ?? false}
            onClick={() => playback.setLoop(!(playback.session?.loop ?? false))}
          >
            <Repeat className="size-5" aria-hidden />
          </SheetButton>
        </div>

        <LyricsDisplay
          lyrics={track.lyrics}
          lyricsBy={track.lyrics_by}
          variant="vault"
        />
      </div>
    </div>
  );
}

function PlayerWaveform({
  track,
  media,
  duration,
}: {
  track: DashboardTrack;
  media: HTMLAudioElement | null;
  duration: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [parsed, setParsed] = useState<ParsedWaveform | 'missing' | 'loading'>('loading');

  useEffect(() => {
    const vault = toVaultTrackData(track);
    const vaultPath = vault.waveform_json_vault_path?.trim();
    const publicPath = vault.waveform_json_path?.trim();
    let cancelled = false;
    setParsed('loading');

    const load = async () => {
      try {
        let raw: unknown;
        if (vaultPath) {
          const response = await fetch(vaultStreamUrl(vaultPath), {
            credentials: 'same-origin',
          });
          if (!response.ok) throw new Error(String(response.status));
          raw = await response.json();
        } else if (publicPath) {
          const response = await fetch(resolvePublicAssetsUrl(publicPath));
          if (!response.ok) throw new Error(String(response.status));
          raw = await response.json();
        } else {
          if (!cancelled) setParsed('missing');
          return;
        }
        const next = parseWaveformJson(raw);
        if (!cancelled) setParsed(next ?? 'missing');
      } catch {
        if (!cancelled) setParsed('missing');
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [track]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !media || parsed === 'loading') return;
    if (!Number.isFinite(duration) || duration <= 0) return;

    const peaks =
      parsed !== 'missing'
        ? downsamplePeaksForDisplay(parsed.peaks, WAVEFORM_BINS)
        : [placeholderPeaks(WAVEFORM_BINS)];
    const jsonDuration =
      parsed !== 'missing' && parsed.duration > 0 ? parsed.duration : 0;
    const waveDuration = jsonDuration > 0 ? jsonDuration : duration;
    const coarse =
      typeof window !== 'undefined' &&
      window.matchMedia('(pointer: coarse)').matches;

    const wavesurfer = WaveSurfer.create({
      container,
      media,
      backend: 'MediaElement',
      height: 104,
      waveColor: ['#00f2ff', '#7b2eff'],
      progressColor: 'rgba(123, 46, 255, 0.88)',
      cursorColor: '#e0e7ff',
      cursorWidth: 2,
      peaks,
      duration: waveDuration,
      interact: true,
      dragToSeek: coarse ? { debounceTime: 80 } : { debounceTime: 0 },
      normalize: true,
      barHeight: 0.9,
      fillParent: true,
    });

    return () => {
      try {
        wavesurfer.destroy();
      } catch {
        /* ignore */
      }
    };
  }, [media, parsed, duration > 0, track.track_path]);

  return (
    <div
      ref={containerRef}
      className="min-h-[104px] w-full"
      aria-label="Waveform"
    />
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remain = Math.floor(seconds % 60);
  return `${minutes}:${remain.toString().padStart(2, '0')}`;
}

function placeholderPeaks(length: number): Float32Array {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const t = i / Math.max(1, length - 1);
    const wave =
      Math.sin(t * Math.PI * 14) * 0.22 +
      Math.sin(t * Math.PI * 27) * 0.14 +
      Math.sin(t * Math.PI * 5) * 0.18;
    const envelope = Math.sin(t * Math.PI) * 0.85 + 0.15;
    out[i] = Math.min(1, Math.max(0.06, Math.abs(wave) * envelope));
  }
  return out;
}

function SheetButton({
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
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex size-11 items-center justify-center rounded-full text-[#00f2ff] hover:bg-white/10 disabled:opacity-40 [&_svg]:size-5 ${pressed === false ? 'opacity-45' : ''}`}
    >
      {children}
    </button>
  );
}

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden>
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  );
}

function SkipGlyph({ direction }: { direction: 'back' | 'forward' }) {
  const path =
    direction === 'back'
      ? 'M6 6h2v12H6zm3.5 6 8.5 6V6z'
      : 'M6 18l8.5-6L6 6v12zM16 6h2v12h-2z';
  return (
    <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden>
      <path d={path} />
    </svg>
  );
}
