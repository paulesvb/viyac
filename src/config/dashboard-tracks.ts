import type { DashboardTrack } from '@/lib/dashboard-track-types';

/**
 * Dashboard track list (shown on `/dashboard`). Each entry opens `/music/tracks/[slug]`.
 * When this array is empty, a single track is built from `NEXT_PUBLIC_DASHBOARD_VAULT_TRACK_PATH` (and optional waveform/bg env vars).
 *
 * Example (vault HLS + vault waveform + looping background video):
 * {
 *   slug: 'rocket-57',
 *   title: 'Rocket 57',
 *   featured: true,
 *   track_path: 'rocket-57/index.m3u8',
 *   waveform_json_vault_path: 'rocket-57/waveform.json',
 *   vault_background_video_path: 'rocket-57/video-loop.mp4',
 *   bg_image_path: 'rocket-57/cover.jpg',
 *   lock_screen_art_path: 'rocket-57/album-512.jpg',
 *   description_en: '…',
 *   catalog_track_id: 'uuid-from-public.tracks', // optional: listen log + personal rating on /music/tracks/[slug]
 * },
 */
export const dashboardTracksConfig: DashboardTrack[] = [];
