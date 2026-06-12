-- Covers must keep a valid original; deleting a Genesis row that still has covers is blocked.
ALTER TABLE api.tracks DROP CONSTRAINT IF EXISTS tracks_original_track_id_fkey;

ALTER TABLE api.tracks
  ADD CONSTRAINT tracks_original_track_id_fkey
  FOREIGN KEY (original_track_id) REFERENCES api.tracks (id) ON DELETE RESTRICT;

COMMENT ON COLUMN api.tracks.original_track_id IS
  'Genesis catalog track this cover is based on; null when not a cover. ON DELETE RESTRICT: remove or re-point covers before deleting the original.';
