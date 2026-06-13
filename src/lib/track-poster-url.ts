import type { DashboardTrack } from '@/lib/dashboard-track-types';
import { resolvePublicAssetsUrl } from '@/lib/storage';

export function getTrackPosterUrl(track: DashboardTrack): string | null {
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
