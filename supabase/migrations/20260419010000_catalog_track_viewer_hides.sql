-- Per-viewer hide state for explicitly shared tracks.
-- Keeps the grant intact while removing the track from the viewer's shared list.

CREATE TABLE api.catalog_track_viewer_hides (
  track_id uuid NOT NULL REFERENCES api.tracks (id) ON DELETE CASCADE,
  viewer_user_id text NOT NULL,
  hidden_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (track_id, viewer_user_id)
);

CREATE INDEX catalog_track_viewer_hides_viewer_user_id_idx
  ON api.catalog_track_viewer_hides (viewer_user_id);

COMMENT ON TABLE api.catalog_track_viewer_hides IS
  'Viewer-level hide state for tracks shared via api.catalog_track_viewers.';

GRANT ALL ON TABLE api.catalog_track_viewer_hides TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE api.catalog_track_viewer_hides TO authenticated, anon;

ALTER TABLE api.catalog_track_viewer_hides ENABLE ROW LEVEL SECURITY;
