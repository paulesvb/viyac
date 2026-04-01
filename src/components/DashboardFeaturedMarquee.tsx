'use client';

import Link from 'next/link';
import { VaultPlayer } from '@/components/VaultPlayer';
import type { DashboardTrack } from '@/lib/dashboard-track-types';
import { toVaultTrackData } from '@/lib/dashboard-tracks';

type Props = {
  track: DashboardTrack;
};

export function DashboardFeaturedMarquee({ track }: Props) {
  const ticker =
    `${track.title}${track.description_en ? ` — ${track.description_en}` : ''} · `;
  const segment = Array.from({ length: 8 }, () => ticker).join('');

  return (
    <section
      className="w-full min-w-0 overflow-hidden rounded-xl border border-cyan-500/25 bg-gradient-to-b from-zinc-950/90 to-zinc-950/40 shadow-[0_0_40px_-12px_rgba(34,211,238,0.2)] ring-1 ring-white/5 sm:rounded-2xl"
      aria-labelledby="featured-track-heading"
    >
      <div className="border-b border-cyan-500/15 bg-black/40 px-3 py-2.5 sm:px-4 sm:py-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <span
              id="featured-track-heading"
              className="shrink-0 self-start rounded-full bg-cyan-400/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-cyan-300 sm:self-center"
            >
              Featured
            </span>
            <div className="relative min-h-[1.5rem] min-w-0 flex-1 overflow-hidden">
              <div className="animate-dashboard-marquee flex w-max gap-16 whitespace-nowrap text-sm text-cyan-100/90">
                <span>{segment}</span>
                <span aria-hidden>{segment}</span>
              </div>
            </div>
          </div>
          <Link
            href={`/music/tracks/${encodeURIComponent(track.slug)}`}
            className="shrink-0 self-start text-xs font-medium text-fuchsia-300/90 underline-offset-4 hover:text-fuchsia-200 hover:underline sm:self-center"
          >
            Full page
          </Link>
        </div>
      </div>

      <div className="p-2 sm:p-3 md:p-4">
        <VaultPlayer variant="embedded" trackData={toVaultTrackData(track)} />
      </div>
    </section>
  );
}
