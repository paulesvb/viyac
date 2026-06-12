-- Per-user favorites for catalog tracks (Clerk user IDs).

CREATE TABLE api.catalog_track_favorites (
  user_id text NOT NULL,
  track_id uuid NOT NULL REFERENCES api.tracks (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, track_id)
);

CREATE INDEX catalog_track_favorites_user_id_idx
  ON api.catalog_track_favorites (user_id);

COMMENT ON TABLE api.catalog_track_favorites IS
  'User (Clerk ID) favorited tracks for quick access.';

GRANT ALL ON TABLE api.catalog_track_favorites TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE api.catalog_track_favorites TO authenticated, anon;

ALTER TABLE api.catalog_track_favorites ENABLE ROW LEVEL SECURITY;
