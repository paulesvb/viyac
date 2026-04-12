-- Optional plain-text lyrics; bracket tags on their own line delimit sections (see app parser).
ALTER TABLE api.tracks
  ADD COLUMN IF NOT EXISTS lyrics text;

COMMENT ON COLUMN api.tracks.lyrics IS
  'Optional lyrics. Section headers: own line like [VERSE], [CHORUS] (letters, numbers, spaces, hyphen).';
