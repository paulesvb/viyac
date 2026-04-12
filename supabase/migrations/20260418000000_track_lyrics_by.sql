-- Optional credit for who wrote the lyrics (displayed with lyrics when set).
ALTER TABLE api.tracks
  ADD COLUMN IF NOT EXISTS lyrics_by text;

COMMENT ON COLUMN api.tracks.lyrics_by IS
  'Optional attribution (e.g. writer name) shown with lyrics when set.';
