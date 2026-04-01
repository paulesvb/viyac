import { dashboardTracksConfig } from '@/config/dashboard-tracks';
import type { DashboardTrack } from '@/lib/dashboard-track-types';
import { resolvePublicAssetsUrl } from '@/lib/storage';
import type { VaultTrackData } from '@/components/VaultPlayer';

export type { DashboardTrack };

const PICSUM_BG =
  'https://picsum.photos/seed/viyac-dashboard/1920/1080';

function envFallbackTracks(): DashboardTrack[] {
  const path = process.env.NEXT_PUBLIC_DASHBOARD_VAULT_TRACK_PATH?.trim();
  if (!path) return [];
  const wf = process.env.NEXT_PUBLIC_DASHBOARD_WAVEFORM_JSON_PATH?.trim();
  return [
    {
      slug: 'preview',
      title: 'Preview',
      track_path: path,
      featured: true,
      ...(wf ? { waveform_json_path: wf } : {}),
      description_en: 'Signed-in playback from the vault bucket.',
    },
  ];
}

/** Tracks from `src/config/dashboard-tracks.ts`, or a single entry from env when the list is empty. */
export function getDashboardTracks(): DashboardTrack[] {
  if (dashboardTracksConfig.length > 0) {
    return dashboardTracksConfig;
  }
  return envFallbackTracks();
}

export function getDashboardTrackBySlug(
  slug: string,
): DashboardTrack | undefined {
  const decoded = decodeURIComponent(slug);
  return getDashboardTracks().find((t) => t.slug === decoded);
}

/** Track shown in the dashboard marquee: first with `featured: true`, else first in list. */
export function getFeaturedDashboardTrack(): DashboardTrack | null {
  const tracks = getDashboardTracks();
  if (tracks.length === 0) return null;
  const marked = tracks.find((t) => t.featured === true);
  return marked ?? tracks[0] ?? null;
}

/** All tracks except the one selected for the marquee. */
export function getOtherDashboardTracks(): DashboardTrack[] {
  const tracks = getDashboardTracks();
  const featured = getFeaturedDashboardTrack();
  if (!featured) return [];
  return tracks.filter((t) => t.slug !== featured.slug);
}

function resolveBgImageUrl(track: DashboardTrack): string {
  const pathOrUrl =
    track.bg_image_path?.trim() ||
    process.env.NEXT_PUBLIC_DASHBOARD_VAULT_BG_PATH?.trim();
  if (!pathOrUrl) return PICSUM_BG;
  try {
    return resolvePublicAssetsUrl(pathOrUrl);
  } catch {
    return PICSUM_BG;
  }
}

function resolveOptionalAssetUrl(
  pathOrUrl: string | undefined,
): string | undefined {
  const t = pathOrUrl?.trim();
  if (!t) return undefined;
  try {
    return resolvePublicAssetsUrl(t);
  } catch {
    return undefined;
  }
}

/** Props for `VaultPlayer` — resolves public asset paths to URLs. */
export function toVaultTrackData(track: DashboardTrack): VaultTrackData {
  return {
    bg_image_url: resolveBgImageUrl(track),
    content_type: track.content_type ?? 'video',
    track_path: track.track_path,
    thumbnail_url: resolveOptionalAssetUrl(track.thumbnail_url),
    title: track.title,
    description_en: track.description_en,
    description_es: track.description_es,
    ...(track.waveform_json_path?.trim()
      ? { waveform_json_path: track.waveform_json_path.trim() }
      : {}),
  };
}
