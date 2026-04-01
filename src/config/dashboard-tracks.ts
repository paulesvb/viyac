import type { DashboardTrack } from '@/lib/dashboard-track-types';

/**
 * Dashboard track list (shown on `/dashboard`). Each entry opens `/music/tracks/[slug]`.
 * When this array is empty, a single track is built from `NEXT_PUBLIC_DASHBOARD_VAULT_TRACK_PATH` (and optional waveform/bg env vars).
 *
 * Example:
 * {
 *   slug: 'rocket-57',
 *   title: 'Rocket 57',
 *   featured: true,
 *   track_path: 'releases/rocket-57/master.m3u8',
 *   waveform_json_path: 'rocket-57/waveform.json',
 *   bg_image_path: 'rocket-57/cover.jpg',
 *   description_en: '…',
 * },
 */
export const dashboardTracksConfig: DashboardTrack[] = [];
