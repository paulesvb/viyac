-- Explicit viewers for private/unlisted catalog tracks (Clerk user IDs).
-- Owner always has access; grants add signed-in users who are not the owner.

CREATE TABLE api.catalog_track_viewers (
  track_id uuid NOT NULL REFERENCES api.tracks (id) ON DELETE CASCADE,
  viewer_user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (track_id, viewer_user_id)
);

CREATE INDEX catalog_track_viewers_viewer_user_id_idx
  ON api.catalog_track_viewers (viewer_user_id);

COMMENT ON TABLE api.catalog_track_viewers IS
  'Users (Clerk IDs) who may access a catalog track when it is not world-readable via visibility/album alone.';

GRANT ALL ON TABLE api.catalog_track_viewers TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE api.catalog_track_viewers TO authenticated, anon;

ALTER TABLE api.catalog_track_viewers ENABLE ROW LEVEL SECURITY;
