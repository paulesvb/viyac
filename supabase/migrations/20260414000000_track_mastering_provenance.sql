-- How the master was produced (studio vs AI chain).

ALTER TABLE api.tracks
  ADD COLUMN IF NOT EXISTS mastering_provenance text;

ALTER TABLE api.tracks
  DROP CONSTRAINT IF EXISTS tracks_mastering_provenance_check;

ALTER TABLE api.tracks
  ADD CONSTRAINT tracks_mastering_provenance_check CHECK (
    mastering_provenance IS NULL
    OR mastering_provenance IN ('STUDIO MASTERED', 'AI MASTERED')
  );

COMMENT ON COLUMN api.tracks.mastering_provenance IS
  'STUDIO MASTERED = traditional mastering chain; AI MASTERED = AI-assisted mastering.';
