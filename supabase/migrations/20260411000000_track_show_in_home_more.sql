-- Home (signed-in): which tracks appear in the “More tracks” grid below the featured player.
ALTER TABLE api.tracks
  ADD COLUMN IF NOT EXISTS show_in_home_more_tracks boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN api.tracks.show_in_home_more_tracks IS
  'When true, the track may appear in the signed-in Home “More tracks” list (still excluded when it is the featured row).';
