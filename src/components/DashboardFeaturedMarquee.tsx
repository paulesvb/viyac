'use client';

import { useTranslate } from '@/hooks/use-translate';
import { Repeat1 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { VaultPlayer, type VaultTrackData } from '@/components/VaultPlayer';
import type { DashboardTrack } from '@/lib/dashboard-track-types';
import { toVaultTrackData } from '@/lib/dashboard-tracks';

type Props = {
  track: DashboardTrack;
  /** Shown in the pill (e.g. "Featured" or "Now playing" when user picked another track). */
  headingLabel?: string;
  /** Increment when the user uses “Play in player” on a home list row — starts playback when ready. */
  autoPlayNonce?: number;
  /** When set (e.g. album page), called when the track finishes — advance queue or loop. */
  onPlaybackEnded?: () => void;
  resolveNextTrack?: () => VaultTrackData | null;
  resolvePreviousTrack?: () => VaultTrackData | null;
  onTrackAdvanced?: (track: VaultTrackData) => void;
  playbackControlAction?: 'toggle' | 'stop';
  playbackControlNonce?: number;
  onPlayingChange?: (playing: boolean) => void;
  /** Repeat current track when it ends (shown in player chrome when set). */
  repeatOneEnabled?: boolean;
  onRepeatOneChange?: (enabled: boolean) => void;
};

export function DashboardFeaturedMarquee({
  track,
  headingLabel,
  autoPlayNonce = 0,
  onPlaybackEnded,
  resolveNextTrack,
  resolvePreviousTrack,
  onTrackAdvanced,
  playbackControlAction,
  playbackControlNonce = 0,
  onPlayingChange,
  repeatOneEnabled,
  onRepeatOneChange,
}: Props) {
  const t = useTranslate();
  const repeatOn = Boolean(repeatOneEnabled);

  return (
    <section
      className="isolate w-full min-w-0 overflow-hidden rounded-xl border border-cyan-500/25 bg-zinc-950 shadow-[0_0_40px_-12px_rgba(34,211,238,0.2)]"
      aria-labelledby="featured-track-heading"
    >
      <div className="border-b border-cyan-500/15 bg-black/40 px-3 py-2.5 sm:px-4 sm:py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center">
            <span
              id="featured-track-heading"
              className="shrink-0 rounded-full bg-cyan-400/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-cyan-300"
            >
              {headingLabel ?? t('badgeFeatured')}
            </span>
          </div>
          {onRepeatOneChange ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onRepeatOneChange(!repeatOn)}
              aria-label={t('ctaRepeat')}
              aria-pressed={repeatOn}
              className={
                repeatOn
                  ? 'shrink-0 border-[#00f2ff] text-[#00f2ff] hover:border-[#00f2ff] hover:text-[#00f2ff] dark:border-[#00f2ff] dark:text-[#00f2ff] dark:hover:border-[#00f2ff] dark:hover:text-[#00f2ff]'
                  : 'shrink-0'
              }
            >
              <Repeat1 aria-hidden />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl">
        <VaultPlayer
          variant="embedded"
          trackData={toVaultTrackData(track)}
          lyricsPresentation="collapsible"
          autoPlayNonce={autoPlayNonce}
          onPlaybackEnded={onPlaybackEnded}
          resolveNextTrack={resolveNextTrack}
          resolvePreviousTrack={resolvePreviousTrack}
          onTrackAdvanced={onTrackAdvanced}
          playbackControlAction={playbackControlAction}
          playbackControlNonce={playbackControlNonce}
          onPlayingChange={onPlayingChange}
        />
      </div>
    </section>
  );
}
