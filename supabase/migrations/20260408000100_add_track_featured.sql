-- Add explicit featured flag for dashboard ordering.
-- Featured tracks are shown before non-featured; sort_order still applies within each group.

ALTER TABLE api.tracks
ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS tracks_featured_sort_idx
  ON api.tracks (featured DESC, sort_order ASC, title ASC);
