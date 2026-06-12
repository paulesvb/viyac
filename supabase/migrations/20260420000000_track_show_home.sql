-- Signed-in Home: explicit opt-in (`show_home`, default false) replaces
-- `show_in_home_more_tracks` (formerly default true).
ALTER TABLE api.tracks
  ADD COLUMN IF NOT EXISTS show_home boolean NOT NULL DEFAULT false;

UPDATE api.tracks SET show_home = show_in_home_more_tracks;

ALTER TABLE api.tracks
  DROP COLUMN IF EXISTS show_in_home_more_tracks;

COMMENT ON COLUMN api.tracks.show_home IS
  'When true, the track may appear on signed-in Home (featured player and More tracks; still subject to visibility/album rules).';
