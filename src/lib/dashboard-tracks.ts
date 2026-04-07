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
  const wfVault =
    process.env.NEXT_PUBLIC_DASHBOARD_VAULT_WAVEFORM_PATH?.trim();
  const bgVideo =
    process.env.NEXT_PUBLIC_DASHBOARD_VAULT_BACKGROUND_VIDEO_PATH?.trim();
  return [
    {
      slug: 'preview',
      title: 'Preview',
      track_path: path,
      featured: true,
      ...(wfVault
        ? { waveform_json_vault_path: wfVault }
        : wf
          ? { waveform_json_path: wf }
          : {}),
      ...(bgVideo ? { vault_background_video_path: bgVideo } : {}),
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
  return getOtherDashboardTracksFromList(tracks, featured);
}

/** Marquee track from an explicit list (e.g. catalog + config merge on the server). */
export function getFeaturedDashboardTrackFromList(
  tracks: DashboardTrack[],
): DashboardTrack | null {
  if (tracks.length === 0) return null;
  const marked = tracks.find((t) => t.featured === true);
  return marked ?? tracks[0] ?? null;
}

/** Tracks in `tracks` that are not the featured row (stable when slugs collide via `catalog_track_id`). */
export function getOtherDashboardTracksFromList(
  tracks: DashboardTrack[],
  featured: DashboardTrack | null,
): DashboardTrack[] {
  if (!featured) return [];
  return tracks.filter((t) => {
    if (featured.catalog_track_id && t.catalog_track_id) {
      return t.catalog_track_id !== featured.catalog_track_id;
    }
    return t.slug !== featured.slug;
  });
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
  const wfVault = track.waveform_json_vault_path?.trim();
  const wfPublic = track.waveform_json_path?.trim();
  return {
    bg_image_url: resolveBgImageUrl(track),
    content_type: track.content_type ?? 'video',
    track_path: track.track_path,
    thumbnail_url: resolveOptionalAssetUrl(track.thumbnail_url),
    lock_screen_art_url: resolveOptionalAssetUrl(track.lock_screen_art_path),
    title: track.title,
    description_en: track.description_en,
    description_es: track.description_es,
    ...(wfVault
      ? { waveform_json_vault_path: wfVault }
      : wfPublic
        ? { waveform_json_path: wfPublic }
        : {}),
    ...(track.vault_background_video_path?.trim()
      ? { vault_background_video_path: track.vault_background_video_path.trim() }
      : {}),
    ...(track.catalog_track_id?.trim()
      ? { catalog_track_id: track.catalog_track_id.trim() }
      : {}),
  };
}
