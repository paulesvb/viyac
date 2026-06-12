-- Genre + instrument tags, instrumental flag, release month (via date).
-- Curate release as first day of the month (e.g. 2026-04-01 = April 2026).

ALTER TABLE api.tracks
  ADD COLUMN IF NOT EXISTS genres text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS instruments text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_instrumental boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS release_date date;

COMMENT ON COLUMN api.tracks.genres IS
  'Style tags (e.g. electronic, latin). Lowercase slugs recommended; UI title-cases.';
COMMENT ON COLUMN api.tracks.instruments IS
  'Instrument tags (e.g. piano, guitar). Lowercase slugs recommended.';
COMMENT ON COLUMN api.tracks.is_instrumental IS
  'True when the track is marketed as instrumental (no lead vocal).';
COMMENT ON COLUMN api.tracks.release_date IS
  'Use the 1st of the month for month/year releases (e.g. 2026-04-01 for April 2026).';

-- One-time: copy legacy single genre into genres[] when empty.
UPDATE api.tracks t
SET genres = ARRAY[trim(t.genre)]
WHERE t.genre IS NOT NULL
  AND btrim(t.genre) <> ''
  AND cardinality(t.genres) = 0;

CREATE INDEX IF NOT EXISTS tracks_genres_gin ON api.tracks USING gin (genres);
CREATE INDEX IF NOT EXISTS tracks_instruments_gin ON api.tracks USING gin (instruments);
