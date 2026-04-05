import type { ProvenanceType } from '@/lib/provenance';

/** Row shape for public.albums (music catalog). */
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

/** Row shape for public.tracks (music catalog). */
export type CatalogTrackRow = {
  id: string;
  slug: string;
  title: string;
  isrc_code: string | null;
  owner_id: string;
  genre: string | null;
  composer: string | null;
  tc: string | null;
  duration_ms: number | null;
  quality: 'demo' | 'mix' | 'master' | 'alt' | null;
  visibility: 'private' | 'public' | 'unlisted';
  content_type: 'audio' | 'video';
  provenance_type: ProvenanceType | null;
  track_path: string;
  waveform_json_path: string | null;
  waveform_json_vault_path: string | null;
  vault_background_video_path: string | null;
  thumbnail_path: string | null;
  lock_screen_art_path: string | null;
  description_en: string | null;
  description_es: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};
