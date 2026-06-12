'use client';

import { Pause, Play } from 'lucide-react';
import { ProvenanceBadge } from '@/components/ProvenanceBadge';
import { Button } from '@/components/ui/button';
import type { DashboardTrack } from '@/lib/dashboard-track-types';
import {
  buildCompactTrackMetaLine,
  getTrackCardSecondLine,
} from '@/lib/track-meta';
import { isProvenanceType } from '@/lib/provenance';
import { useTranslate } from '@/hooks/use-translate';

type Props = {
  track: DashboardTrack;
  posterUrl: string | null;
  /** This row’s track is loaded in the featured player. */
  isActive?: boolean;
  /** Media is playing (meaningful when `isActive`). */
  isPlaying?: boolean;
  onPlayInPlayer: () => void;
};

export function DashboardMoreTrackRow({
  track,
  posterUrl,
  isActive = false,
  isPlaying = false,
  onPlayInPlayer,
}: Props) {
  const t = useTranslate();
  const showPause = isActive && isPlaying;
  const secondLine = getTrackCardSecondLine(track);
  const metaLine = buildCompactTrackMetaLine(track);
  const showProvenance =
    track.provenance_type != null &&
    isProvenanceType(track.provenance_type);
  const hasBadges =
    showProvenance || track.is_single || track.is_instrumental;

  return (
    <div
      className={`flex min-h-[52px] w-full max-w-full min-w-0 items-stretch overflow-hidden rounded-lg border bg-card ${
        showPause
          ? 'border-cyan-500/40 bg-muted/25'
          : isActive
            ? 'border-cyan-500/25'
            : 'border-border'
      }`}
    >
      <div className="flex min-w-0 flex-1 items-stretch gap-2 p-2 sm:gap-3 sm:p-3">
        {posterUrl ? (
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md ring-1 ring-border/60 sm:h-14 sm:w-14 md:h-16 md:w-16">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={posterUrl}
              alt={`${track.title} poster`}
              className="absolute inset-0 h-full w-full rounded-md object-cover"
            />
          </div>
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] text-muted-foreground ring-1 ring-border/60 sm:h-14 sm:w-14 md:h-16 md:w-16 sm:text-xs">
            {t('badgeArt')}
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <p className="truncate font-medium text-foreground">{track.title}</p>
          {secondLine ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {secondLine.text}
            </p>
          ) : null}
          {metaLine ? (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground/90">
              {metaLine}
            </p>
          ) : null}
          {hasBadges ? (
            <div className="mt-auto flex flex-wrap items-center justify-end gap-1 pt-1.5">
              {showProvenance ? (
                <ProvenanceBadge
                  type={track.provenance_type}
                  showTooltip={false}
                />
              ) : null}
              {track.is_single ? (
                <span className="rounded-full border border-teal-500/40 bg-teal-950/50 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-teal-200">
                  {t('badgeSingle')}
                </span>
              ) : null}
              {track.is_instrumental ? (
                <span className="rounded-full border border-zinc-500/50 bg-zinc-900/80 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-zinc-200">
                  {t('badgeInstrumental')}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-col justify-center border-l border-border bg-muted/30 p-1.5 sm:p-2.5">
        <Button
          type="button"
          variant="brand"
          size="icon"
          className="size-10 shrink-0 touch-manipulation sm:size-10"
          aria-label={
            showPause
              ? t.params('ctaAriaPauseTrack', { title: track.title })
              : t.params('ctaAriaPlayTrackFeatured', { title: track.title })
          }
          onClick={(e) => {
            e.stopPropagation();
            onPlayInPlayer();
          }}
        >
          {showPause ? (
            <Pause className="size-5 fill-current sm:size-4" aria-hidden />
          ) : (
            <Play className="size-5 fill-current sm:size-4" aria-hidden />
          )}
        </Button>
      </div>
    </div>
  );
}
