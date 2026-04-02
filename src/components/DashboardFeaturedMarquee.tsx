'use client';

import { useState } from 'react';
import { VaultPlayer } from '@/components/VaultPlayer';
import type { DashboardTrack } from '@/lib/dashboard-track-types';
import { toVaultTrackData } from '@/lib/dashboard-tracks';

type Props = {
  track: DashboardTrack;
};

export function DashboardFeaturedMarquee({ track }: Props) {
  const [fullPlayer, setFullPlayer] = useState(false);
  const ticker =
    `${track.title}${track.description_en ? ` — ${track.description_en}` : ''} · `;
  const segment = Array.from({ length: 8 }, () => ticker).join('');

  return (
    <section
      className={`w-full min-w-0 overflow-hidden border border-cyan-500/25 bg-gradient-to-b from-zinc-950/90 to-zinc-950/40 shadow-[0_0_40px_-12px_rgba(34,211,238,0.2)] ring-1 ring-white/5 ${
        fullPlayer
          ? 'fixed inset-x-0 bottom-0 top-16 z-40 rounded-none'
          : 'rounded-xl sm:rounded-2xl'
      }`}
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
          <button
            type="button"
            onClick={() => setFullPlayer((v) => !v)}
            className={`shrink-0 self-start text-xs font-medium underline-offset-4 sm:self-center ${
              fullPlayer
                ? 'rounded-full border border-fuchsia-400/40 bg-fuchsia-500/10 px-3 py-1 text-fuchsia-200 hover:bg-fuchsia-500/20'
                : 'text-fuchsia-300/90 hover:text-fuchsia-200 hover:underline'
            }`}
          >
            {fullPlayer ? 'Back to dashboard' : 'Full page'}
          </button>
        </div>
      </div>

      {fullPlayer ? (
        <div className="pointer-events-none absolute right-3 top-3 z-50 sm:right-4 sm:top-4">
          <button
            type="button"
            onClick={() => setFullPlayer(false)}
            className="pointer-events-auto rounded-full border border-cyan-300/40 bg-zinc-950/90 px-3 py-1 text-xs font-medium text-cyan-100 shadow-lg hover:bg-zinc-900"
          >
            Back to dashboard
          </button>
        </div>
      ) : null}

      <div className={fullPlayer ? 'h-full overflow-auto p-2 sm:p-3 md:p-4' : 'p-2 sm:p-3 md:p-4'}>
        <VaultPlayer
          variant={fullPlayer ? 'fullscreen' : 'embedded'}
          trackData={toVaultTrackData(track)}
        />
      </div>
    </section>
  );
}
