import type { ProvenanceType } from '@/lib/provenance';

export type DashboardTrack = {
  slug: string;
  title: string;
  /** Vault bucket path to HLS playlist (e.g. `folder/master.m3u8`) */
  track_path: string;
  /** Shown in the dashboard marquee; first `featured` wins, else the first track in the list */
  featured?: boolean;
  content_type?: 'video' | 'audio';
  description_en?: string;
  description_es?: string;
  /** Public `assets` key or full URL to waveform.json */
  waveform_json_path?: string;
  /** Vault key for waveform.json (signed URL); overrides public waveform when set */
  waveform_json_vault_path?: string;
  /** Vault key for looping background MP4 (Vault player cinematic layout) */
  vault_background_video_path?: string;
  /** Public `assets` key or full URL for blurred background */
  bg_image_path?: string;
  /** Optional; audio layout only — full URL or `assets` key */
  thumbnail_url?: string;
  /**
   * Square cover for iOS/Android lock screen & media controls (full URL or `assets` key).
   * Prefer this over `thumbnail_url` when the disc image should differ from OS “album art”.
   */
  lock_screen_art_path?: string;
  /** Optional `api.tracks.id` for listen logging and personal ratings. */
  catalog_track_id?: string;
  /** Optional catalog provenance badge (GENESIS / HYBRID / ECHO). */
  provenance_type?: ProvenanceType;
  /** Style tags from `api.tracks.genres`. */
  genres?: string[];
  /** Instrument tags from `api.tracks.instruments`. */
  instruments?: string[];
  /** Marketing flag for instrumental (no lead vocal). */
  is_instrumental?: boolean;
  /**
   * When true, catalog track is not linked to any album (`album_tracks`) — a standalone single.
   * Omitted for static config tracks when unknown.
   */
  is_single?: boolean;
  /** Display name of a containing album (for cards when `is_single` is false). */
  album_title?: string;
  /** ISO date `YYYY-MM-DD`; use 1st of month for month/year releases. */
  release_date?: string;
  /** Track length for UI (`api.tracks.duration_ms`). */
  duration_ms?: number;
};
