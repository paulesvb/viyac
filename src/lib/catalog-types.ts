import type { ProvenanceType } from '@/lib/provenance';

/** `api.tracks.mastering_provenance` — human vs AI mastering chain. */
export const MASTERING_PROVENANCE_VALUES = [
  'STUDIO MASTERED',
  'AI MASTERED',
] as const;

export type MasteringProvenance = (typeof MASTERING_PROVENANCE_VALUES)[number];

export function isMasteringProvenance(
  v: string | null | undefined,
): v is MasteringProvenance {
  return v === 'STUDIO MASTERED' || v === 'AI MASTERED';
}

/** Row shape for api.albums (music catalog). */
export type CatalogAlbumRow = {
  id: string;
  slug: string;
  title: string;
  cover_image_path: string | null;
  visibility: 'private' | 'public' | 'unlisted';
  owner_id: string;
  featured_track_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

/** Row shape for api.tracks (music catalog). */
export type CatalogTrackRow = {
  id: string;
  slug: string;
  title: string;
  isrc_code: string | null;
  owner_id: string;
  genre: string | null;
  /** Style tags; prefer over legacy `genre` when set. */
  genres?: string[] | null;
  /** Instrument tags (e.g. piano, guitar). */
  instruments?: string[] | null;
  is_instrumental?: boolean | null;
  /** First day of month for month/year display (e.g. 2026-04-01). */
  release_date?: string | null;
  composer: string | null;
  tc: string | null;
  duration_ms: number | null;
  quality: 'demo' | 'mix' | 'master' | 'alt' | null;
  visibility: 'private' | 'public' | 'unlisted';
  /** When true, signed-out users may stream and log listens (with visibility/album rules). */
  anonymous_visible?: boolean | null;
  /** When true, may appear on signed-in Home “More tracks” (not the featured marquee row). */
  show_in_home_more_tracks?: boolean | null;
  content_type: 'audio' | 'video';
  provenance_type: ProvenanceType | null;
  /** True when this track is a cover; paired with `original_track_id`. */
  is_cover?: boolean | null;
  /** Genesis original this cover is based on; null if not a cover. */
  original_track_id?: string | null;
  /** Studio vs AI mastering (nullable for legacy rows). */
  mastering_provenance?: MasteringProvenance | null;
  /** Standard stream (HLS or ~256k AAC URL); optional vs vault `track_path`. */
  stream_url: string | null;
  /** Private storage object key for master WAV; signed URL via master-download API after purchase. */
  master_download_url: string | null;
  /** Times a master signed URL was issued via the API for this track. */
  master_download_count: number;
  track_path: string;
  waveform_json_path: string | null;
  waveform_json_vault_path: string | null;
  vault_background_video_path: string | null;
  thumbnail_path: string | null;
  lock_screen_art_path: string | null;
  description_en: string | null;
  description_es: string | null;
  /** Plain-text lyrics; section lines like `[VERSE]` on their own line. */
  lyrics?: string | null;
  /** Optional credit for who wrote the lyrics. */
  lyrics_by?: string | null;
  featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};
