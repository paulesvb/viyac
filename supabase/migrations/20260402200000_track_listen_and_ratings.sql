-- Personal listen progress (for rating eligibility) and per-user track ratings.
-- Tables live in api schema; profiles.id = Clerk user id in public.profiles.

-- ---------------------------------------------------------------------------
-- user_track_listen_progress: cumulative seconds while playback (client-reported, clamped server-side)
-- ---------------------------------------------------------------------------
CREATE TABLE api.user_track_listen_progress (
  user_id text NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES api.tracks (id) ON DELETE CASCADE,
  listened_seconds_total double precision NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, track_id),
  CONSTRAINT user_track_listen_progress_listened_non_negative CHECK (listened_seconds_total >= 0)
);

CREATE INDEX user_track_listen_progress_track_id_idx
  ON api.user_track_listen_progress (track_id);

-- ---------------------------------------------------------------------------
-- track_ratings: one row per user per track (private to user + admin reporting via service role)
-- ---------------------------------------------------------------------------
CREATE TABLE api.track_ratings (
  user_id text NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES api.tracks (id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, track_id)
);

CREATE INDEX track_ratings_track_id_idx ON api.track_ratings (track_id);

-- ---------------------------------------------------------------------------
-- RLS (Clerk JWT sub)
-- ---------------------------------------------------------------------------
ALTER TABLE api.user_track_listen_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.track_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_track_listen_progress_select ON api.user_track_listen_progress
  FOR SELECT USING (user_id = (auth.jwt()->>'sub'));

CREATE POLICY user_track_listen_progress_insert ON api.user_track_listen_progress
  FOR INSERT WITH CHECK (user_id = (auth.jwt()->>'sub'));

CREATE POLICY user_track_listen_progress_update ON api.user_track_listen_progress
  FOR UPDATE USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

CREATE POLICY track_ratings_select ON api.track_ratings FOR SELECT USING (
  user_id = (auth.jwt()->>'sub')
);

CREATE POLICY track_ratings_insert ON api.track_ratings FOR INSERT WITH CHECK (
  user_id = (auth.jwt()->>'sub')
);

CREATE POLICY track_ratings_update ON api.track_ratings FOR UPDATE USING (
  user_id = (auth.jwt()->>'sub')
)
WITH CHECK (user_id = (auth.jwt()->>'sub'));

CREATE POLICY track_ratings_delete ON api.track_ratings FOR DELETE USING (
  user_id = (auth.jwt()->>'sub')
);

-- New tables in api: match catalog grants
GRANT ALL ON api.user_track_listen_progress TO postgres, service_role;
GRANT ALL ON api.track_ratings TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON api.user_track_listen_progress TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON api.track_ratings TO authenticated, anon;
