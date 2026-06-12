-- Cover versions point at a single Genesis original; originals may be any owner.
-- FK on-delete behavior is tightened to RESTRICT in a follow-up migration.

ALTER TABLE api.tracks
  ADD COLUMN IF NOT EXISTS is_cover boolean NOT NULL DEFAULT false;

ALTER TABLE api.tracks
  ADD COLUMN IF NOT EXISTS original_track_id uuid REFERENCES api.tracks (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tracks_original_track_id_idx ON api.tracks (original_track_id);

COMMENT ON COLUMN api.tracks.is_cover IS
  'True when this row is a cover version; must match (original_track_id IS NOT NULL).';
COMMENT ON COLUMN api.tracks.original_track_id IS
  'Genesis catalog track this cover is based on; null when not a cover.';

ALTER TABLE api.tracks
  DROP CONSTRAINT IF EXISTS tracks_cover_original_consistency;

ALTER TABLE api.tracks
  ADD CONSTRAINT tracks_cover_original_consistency CHECK (
    is_cover = (original_track_id IS NOT NULL)
  );
