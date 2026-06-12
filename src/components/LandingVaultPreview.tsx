'use client';

import { VaultPlayer } from '@/components/VaultPlayer';
import type { DashboardTrack } from '@/lib/dashboard-track-types';
import { toVaultTrackData } from '@/lib/dashboard-tracks';

type Props = {
  track: DashboardTrack;
};

/** Public landing: same chrome as the home marquee, without full-page mode. */
export function LandingVaultPreview({ track }: Props) {
  return (
    <div className="mx-auto mb-8 w-full max-w-6xl min-w-0 sm:mb-10">
      <section
        className="isolate w-full min-w-0 overflow-hidden rounded-xl border border-cyan-500/25 bg-zinc-950 shadow-[0_0_40px_-12px_rgba(34,211,238,0.2)]"
        aria-label={`Preview: ${track.title}`}
      >
        <div className="overflow-hidden rounded-xl">
          <VaultPlayer
            variant="embedded"
            trackData={toVaultTrackData(track)}
          />
        </div>
      </section>
    </div>
  );
}
