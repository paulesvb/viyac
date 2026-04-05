-- Music catalog: api schema (tracks, albums, album_tracks).
-- profiles stays in public; FKs reference public.profiles(id).
-- RLS uses auth.jwt()->>'sub' for Clerk JWTs once Supabase third-party auth is configured.
-- Until then, server routes using the service role bypass RLS.
-- PostgREST: add schema `api` under Project Settings → API → Exposed schemas.

CREATE SCHEMA IF NOT EXISTS api;

-- ---------------------------------------------------------------------------
-- profiles.role (platform admin later; default listener/user)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));

-- ---------------------------------------------------------------------------
-- tracks (canonical recording; may appear on many albums via album_tracks)
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

CREATE INDEX tracks_owner_id_idx ON api.tracks (owner_id);

-- ---------------------------------------------------------------------------
-- albums
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
-- album_tracks (many-to-many)
-- ---------------------------------------------------------------------------
CREATE TABLE api.album_tracks (
  album_id uuid NOT NULL REFERENCES api.albums (id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES api.tracks (id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (album_id, track_id)
);

CREATE INDEX album_tracks_track_id_idx ON api.album_tracks (track_id);

-- ---------------------------------------------------------------------------
-- Schema grants (RLS still applies for anon/authenticated)
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA api TO postgres, anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA api TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA api TO postgres, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA api TO authenticated, anon;

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

-- Albums: public / unlisted readable by anyone; private only owner
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

-- Tracks: owner always; or visible on a public/unlisted album
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

-- album_tracks: readable if album is readable; writable if album owner
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
