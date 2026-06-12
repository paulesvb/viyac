-- Anonymous preview: flag on tracks + cumulative listen seconds per anonymous listener (cookie id).

ALTER TABLE api.tracks
  ADD COLUMN IF NOT EXISTS anonymous_visible boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN api.tracks.anonymous_visible IS
  'When true, unauthenticated users may open the track page, stream from the vault, and post listen heartbeats (if visibility rules allow).';

CREATE TABLE IF NOT EXISTS api.anonymous_listen_progress (
  listener_id uuid NOT NULL,
  track_id uuid NOT NULL REFERENCES api.tracks (id) ON DELETE CASCADE,
  listened_seconds_total double precision NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (listener_id, track_id),
  CONSTRAINT anonymous_listen_progress_listened_non_negative CHECK (listened_seconds_total >= 0)
);

CREATE INDEX IF NOT EXISTS anonymous_listen_progress_track_id_idx
  ON api.anonymous_listen_progress (track_id);

ALTER TABLE api.anonymous_listen_progress ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON api.anonymous_listen_progress TO postgres, service_role;
