-- =============================================================================
-- Viyac full schema: public.profiles (Clerk) + api.* (catalog, listens, ratings, masters)
-- =============================================================================
-- After a reset, run this once (CLI: single migration in folder, or SQL Editor).
--
-- Optional wipe before apply (uncomment):
--   DROP SCHEMA IF EXISTS api CASCADE;
--   DROP TABLE IF EXISTS public.profiles CASCADE;
--
-- PostgREST: add schema `api` under Project Settings → API → Exposed schemas.
-- RLS uses auth.jwt()->>'sub' when Clerk JWT is configured; until then use service role from Next.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS api;

-- ---------------------------------------------------------------------------
-- public.profiles — upserted by /api/webhooks/clerk (SUPABASE_PROFILES_SCHEMA)
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id text PRIMARY KEY,
  email text NOT NULL,
  display_name text,
  auth_provider text,
  auth_providers jsonb NOT NULL DEFAULT '[]'::jsonb,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profiles_email_idx ON public.profiles (email);

-- ---------------------------------------------------------------------------
-- api.tracks
-- ---------------------------------------------------------------------------
CREATE TABLE api.tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  title text NOT NULL,
  isrc_code varchar(12) UNIQUE,
  owner_id text NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  genre text,
  composer text,
  tc text,
  duration_ms integer,
  quality text CHECK (
    quality IS NULL
    OR quality IN ('demo', 'mix', 'master', 'alt')
  ),
  visibility text NOT NULL DEFAULT 'private' CHECK (
    visibility IN ('private', 'public', 'unlisted')
  ),
  content_type text NOT NULL DEFAULT 'audio' CHECK (
    content_type IN ('audio', 'video')
  ),
  provenance_type text CHECK (
    provenance_type IS NULL
    OR provenance_type IN ('genesis', 'hybrid', 'echo')
  ),
  stream_url text,
  master_download_url text,
  master_download_count integer NOT NULL DEFAULT 0
    CHECK (master_download_count >= 0),
  track_path text NOT NULL,
  waveform_json_path text,
  waveform_json_vault_path text,
  vault_background_video_path text,
  thumbnail_path text,
  lock_screen_art_path text,
  description_en text,
  description_es text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, slug)
);

COMMENT ON COLUMN api.tracks.stream_url IS
  'Standard-quality stream: HTTPS URL to HLS playlist or ~256kbps AAC, etc.';
COMMENT ON COLUMN api.tracks.master_download_url IS
  'Private bucket object key for 24-bit/48kHz master WAV; signed URL via API after purchase.';
COMMENT ON COLUMN api.tracks.master_download_count IS
  'Increments when the API issues a master WAV signed URL (initiated download).';

CREATE INDEX tracks_owner_id_idx ON api.tracks (owner_id);

-- ---------------------------------------------------------------------------
-- api.albums
-- ---------------------------------------------------------------------------
CREATE TABLE api.albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  cover_image_path text,
  visibility text NOT NULL DEFAULT 'private' CHECK (
    visibility IN ('private', 'public', 'unlisted')
  ),
  owner_id text NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  featured_track_id uuid REFERENCES api.tracks (id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX albums_owner_id_idx ON api.albums (owner_id);

-- ---------------------------------------------------------------------------
-- api.album_tracks
-- ---------------------------------------------------------------------------
CREATE TABLE api.album_tracks (
  album_id uuid NOT NULL REFERENCES api.albums (id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES api.tracks (id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (album_id, track_id)
);

CREATE INDEX album_tracks_track_id_idx ON api.album_tracks (track_id);

-- ---------------------------------------------------------------------------
-- api.user_track_listen_progress
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
-- api.track_ratings
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
-- api.track_master_purchases (insert via payment webhook / service role)
-- ---------------------------------------------------------------------------
CREATE TABLE api.track_master_purchases (
  user_id text NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES api.tracks (id) ON DELETE CASCADE,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, track_id)
);

CREATE INDEX track_master_purchases_track_id_idx ON api.track_master_purchases (track_id);

-- ---------------------------------------------------------------------------
-- Master download counter RPC (service role from Next)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION api.increment_track_master_download(p_track_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = api, pg_temp
AS $$
DECLARE n integer;
BEGIN
  UPDATE api.tracks
  SET
    master_download_count = master_download_count + 1,
    updated_at = now()
  WHERE id = p_track_id
  RETURNING master_download_count INTO n;
  RETURN COALESCE(n, 0);
END;
$$;

REVOKE ALL ON FUNCTION api.increment_track_master_download(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.increment_track_master_download(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION api.increment_track_master_download(uuid) TO postgres;

-- ---------------------------------------------------------------------------
-- Grants (api schema)
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA api TO postgres, anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA api TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA api TO postgres, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA api TO authenticated, anon;

-- Purchases are inserted only with service role; JWT users may read their own rows (RLS).
REVOKE INSERT, UPDATE, DELETE ON api.track_master_purchases FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON api.track_master_purchases FROM anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA api
  GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA api
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA api
  GRANT ALL ON SEQUENCES TO postgres, service_role;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
ALTER TABLE api.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.album_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.user_track_listen_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.track_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.track_master_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY albums_select ON api.albums FOR SELECT USING (
  visibility IN ('public', 'unlisted')
  OR owner_id = (auth.jwt()->>'sub')
);

CREATE POLICY albums_insert ON api.albums FOR INSERT
WITH CHECK (owner_id = (auth.jwt()->>'sub'));

CREATE POLICY albums_update ON api.albums FOR UPDATE USING (
  owner_id = (auth.jwt()->>'sub')
)
WITH CHECK (owner_id = (auth.jwt()->>'sub'));

CREATE POLICY albums_delete ON api.albums FOR DELETE USING (
  owner_id = (auth.jwt()->>'sub')
);

CREATE POLICY tracks_select ON api.tracks FOR SELECT USING (
  owner_id = (auth.jwt()->>'sub')
  OR visibility IN ('public', 'unlisted')
  OR EXISTS (
    SELECT 1
    FROM api.album_tracks at
    JOIN api.albums a ON a.id = at.album_id
    WHERE
      at.track_id = tracks.id
      AND a.visibility IN ('public', 'unlisted')
  )
);

CREATE POLICY tracks_insert ON api.tracks FOR INSERT
WITH CHECK (owner_id = (auth.jwt()->>'sub'));

CREATE POLICY tracks_update ON api.tracks FOR UPDATE USING (
  owner_id = (auth.jwt()->>'sub')
)
WITH CHECK (owner_id = (auth.jwt()->>'sub'));

CREATE POLICY tracks_delete ON api.tracks FOR DELETE USING (
  owner_id = (auth.jwt()->>'sub')
);

CREATE POLICY album_tracks_select ON api.album_tracks FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM api.albums a
    WHERE
      a.id = album_tracks.album_id
      AND (
        a.visibility IN ('public', 'unlisted')
        OR a.owner_id = (auth.jwt()->>'sub')
      )
  )
);

CREATE POLICY album_tracks_insert ON api.album_tracks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM api.albums a
    WHERE
      a.id = album_tracks.album_id
      AND a.owner_id = (auth.jwt()->>'sub')
  )
);

CREATE POLICY album_tracks_update ON api.album_tracks FOR UPDATE USING (
  EXISTS (
    SELECT 1
    FROM api.albums a
    WHERE
      a.id = album_tracks.album_id
      AND a.owner_id = (auth.jwt()->>'sub')
  )
);

CREATE POLICY album_tracks_delete ON api.album_tracks FOR DELETE USING (
  EXISTS (
    SELECT 1
    FROM api.albums a
    WHERE
      a.id = album_tracks.album_id
      AND a.owner_id = (auth.jwt()->>'sub')
  )
);

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

CREATE POLICY track_master_purchases_select ON api.track_master_purchases
  FOR SELECT USING (user_id = (auth.jwt()->>'sub'));
