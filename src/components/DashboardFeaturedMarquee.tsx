'use client';

import { useEffect, useState } from 'react';
import { VaultPlayer } from '@/components/VaultPlayer';
import type { DashboardTrack } from '@/lib/dashboard-track-types';
import { toVaultTrackData } from '@/lib/dashboard-tracks';

type Props = {
  track: DashboardTrack;
};

export function DashboardFeaturedMarquee({ track }: Props) {
  const [fullPlayer, setFullPlayer] = useState(false);

  useEffect(() => {
    if (!fullPlayer) return;
    const scrollY = window.scrollY;
    const bodyStyle = document.body.style;
    const htmlStyle = document.documentElement.style;
    const prevBodyOverflow = bodyStyle.overflow;
    const prevBodyPosition = bodyStyle.position;
    const prevBodyTop = bodyStyle.top;
    const prevBodyWidth = bodyStyle.width;
    const prevHtmlOverflow = htmlStyle.overflow;

    htmlStyle.overflow = 'hidden';
    bodyStyle.overflow = 'hidden';
    bodyStyle.position = 'fixed';
    bodyStyle.top = `-${scrollY}px`;
    bodyStyle.width = '100%';

    return () => {
      htmlStyle.overflow = prevHtmlOverflow;
      bodyStyle.overflow = prevBodyOverflow;
      bodyStyle.position = prevBodyPosition;
      bodyStyle.top = prevBodyTop;
      bodyStyle.width = prevBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [fullPlayer]);

  return (
    <section
      className={`isolate w-full min-w-0 overflow-hidden border border-cyan-500/25 bg-zinc-950 shadow-[0_0_40px_-12px_rgba(34,211,238,0.2)] ${
        fullPlayer
          ? 'fixed inset-x-0 bottom-0 top-16 z-40 rounded-none'
          : 'rounded-xl'
      }`}
      aria-labelledby="featured-track-heading"
    >
      <div className="border-b border-cyan-500/15 bg-black/40 px-3 py-2.5 sm:px-4 sm:py-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex min-w-0 flex-1 items-center">
            <span
              id="featured-track-heading"
              className="shrink-0 self-start rounded-full bg-cyan-400/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-cyan-300 sm:self-center"
            >
              Featured
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFullPlayer((v) => !v)}
            className="shrink-0 self-start rounded-full border border-fuchsia-400/40 bg-fuchsia-500/10 px-3 py-1 text-xs font-medium text-fuchsia-200 hover:bg-fuchsia-500/20 sm:self-center"
          >
            {fullPlayer ? 'Back to home' : 'Full page'}
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
            Back to home
          </button>
        </div>
      ) : null}

      <div
        className={
          fullPlayer
            ? 'h-full overflow-auto p-2 sm:p-3 md:p-4'
            : 'overflow-hidden rounded-xl'
        }
      >
        <VaultPlayer
          variant={fullPlayer ? 'fullscreen' : 'embedded'}
          trackData={toVaultTrackData(track)}
          lyricsPresentation={fullPlayer ? 'inline' : 'collapsible'}
        />
      </div>
    </section>
  );
}
