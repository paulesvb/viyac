'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ProvenanceBadge } from '@/components/ProvenanceBadge';
import { Button } from '@/components/ui/button';
import type { DashboardTrack } from '@/lib/dashboard-track-types';
import {
  buildCompactTrackMetaLine,
  getTrackCardSecondLine,
} from '@/lib/track-meta';
import { resolvePublicAssetsUrl } from '@/lib/storage';
import { hideSharedTrack } from '@/actions/shared-tracks';
import { useTranslate } from '@/hooks/use-translate';

type Props = {
  tracks: DashboardTrack[];
};

function getTrackPosterUrl(track: DashboardTrack): string | null {
  const source =
    track.thumbnail_url?.trim() ||
    track.lock_screen_art_path?.trim() ||
    process.env.NEXT_PUBLIC_MEDIA_SESSION_ART_URL?.trim();
  if (!source) return null;
  try {
    return resolvePublicAssetsUrl(source);
  } catch {
    return null;
  }
}

export default function SharedTracksPageClient({ tracks }: Props) {
  const t = useTranslate();
  const [hiddenTrackIds, setHiddenTrackIds] = useState<Set<string>>(new Set());
  const [pendingTrackId, setPendingTrackId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visibleTracks = tracks.filter(
    (track) =>
      track.catalog_track_id != null && !hiddenTrackIds.has(track.catalog_track_id),
  );

  const hideTrack = (trackId: string) => {
    setPendingTrackId(trackId);
    startTransition(async () => {
      const result = await hideSharedTrack(trackId);
      if (result.ok) {
        setHiddenTrackIds((prev) => new Set(prev).add(trackId));
      }
      setPendingTrackId(null);
    });
  };

  return (
    <div className="min-w-0 w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mx-auto mb-6 max-w-6xl sm:mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {t('pageSharedTitle')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('pageSharedDescription')}
        </p>
      </header>

      <div className="mx-auto max-w-6xl">
        {visibleTracks.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            {t('pageSharedEmpty')}
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {visibleTracks.map((track) => {
              const trackId = track.catalog_track_id?.trim();
              if (!trackId) return null;
              const posterUrl = getTrackPosterUrl(track);
              const secondLine = getTrackCardSecondLine(track);
              const metaLine = buildCompactTrackMetaLine(track);
              const othersCount = track.shared_with_others_count ?? 0;
              const othersNames = (track.shared_with_others_names ?? []).join(', ');

              return (
                <li key={trackId} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-start gap-3">
                    <Link
                      href={`/music/tracks/${encodeURIComponent(track.slug)}`}
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      {posterUrl ? (
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md ring-1 ring-border/60">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={posterUrl}
                            alt={`${track.title} poster`}
                            className="absolute inset-0 h-full w-full rounded-md object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground ring-1 ring-border/60">
                          {t('badgeArt')}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium text-foreground">{track.title}</p>
                          <ProvenanceBadge
                            type={track.provenance_type}
                            showTooltip={false}
                          />
                        </div>
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
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {t('pageSharedAlsoShared')}{' '}
                          {othersCount}{' '}
                          {othersCount === 1
                            ? t('pageSharedOtherSingular')
                            : t('pageSharedOtherPlural')}
                          {othersNames ? `: ${othersNames}` : ''}
                        </p>
                      </div>
                    </Link>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isPending && pendingTrackId === trackId}
                      onClick={() => hideTrack(trackId)}
                    >
                      {t('ctaHide')}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
