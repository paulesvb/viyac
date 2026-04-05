-- Music catalog: albums, tracks, album_tracks.
-- profiles.id is the Clerk user id (text), matching webhook upserts.
-- RLS uses auth.jwt()->>'sub' for Clerk JWTs once Supabase third-party auth is configured.
-- Until then, server routes using the service role bypass RLS.

-- ---------------------------------------------------------------------------
-- profiles.role (platform admin later; default listener/user)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));

-- ---------------------------------------------------------------------------
-- tracks (canonical recording; may appear on many albums via album_tracks)
-- ---------------------------------------------------------------------------
CREATE TABLE public.tracks (
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

CREATE INDEX tracks_owner_id_idx ON public.tracks (owner_id);

-- ---------------------------------------------------------------------------
-- albums
-- ---------------------------------------------------------------------------
CREATE TABLE public.albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  cover_image_path text,
  visibility text NOT NULL DEFAULT 'private' CHECK (
    visibility IN ('private', 'public', 'unlisted')
  ),
  owner_id text NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  featured_track_id uuid REFERENCES public.tracks (id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX albums_owner_id_idx ON public.albums (owner_id);

-- ---------------------------------------------------------------------------
-- album_tracks (many-to-many)
-- ---------------------------------------------------------------------------
CREATE TABLE public.album_tracks (
  album_id uuid NOT NULL REFERENCES public.albums (id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES public.tracks (id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (album_id, track_id)
);

CREATE INDEX album_tracks_track_id_idx ON public.album_tracks (track_id);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_tracks ENABLE ROW LEVEL SECURITY;

-- Helper: current JWT subject (Clerk user id when JWT template maps sub)
-- Albums: public / unlisted readable by anyone; private only owner
CREATE POLICY albums_select ON public.albums FOR SELECT USING (
  visibility IN ('public', 'unlisted')
  OR owner_id = (auth.jwt()->>'sub')
);

CREATE POLICY albums_insert ON public.albums FOR INSERT
WITH CHECK (owner_id = (auth.jwt()->>'sub'));

CREATE POLICY albums_update ON public.albums FOR UPDATE USING (
  owner_id = (auth.jwt()->>'sub')
)
WITH CHECK (owner_id = (auth.jwt()->>'sub'));

CREATE POLICY albums_delete ON public.albums FOR DELETE USING (
  owner_id = (auth.jwt()->>'sub')
);

-- Tracks: owner always; or visible on a public/unlisted album
CREATE POLICY tracks_select ON public.tracks FOR SELECT USING (
  owner_id = (auth.jwt()->>'sub')
  OR visibility IN ('public', 'unlisted')
  OR EXISTS (
    SELECT 1
    FROM public.album_tracks at
    JOIN public.albums a ON a.id = at.album_id
    WHERE
      at.track_id = tracks.id
      AND a.visibility IN ('public', 'unlisted')
  )
);

CREATE POLICY tracks_insert ON public.tracks FOR INSERT
WITH CHECK (owner_id = (auth.jwt()->>'sub'));

CREATE POLICY tracks_update ON public.tracks FOR UPDATE USING (
  owner_id = (auth.jwt()->>'sub')
)
WITH CHECK (owner_id = (auth.jwt()->>'sub'));

CREATE POLICY tracks_delete ON public.tracks FOR DELETE USING (
  owner_id = (auth.jwt()->>'sub')
);

-- album_tracks: readable if album is readable; writable if album owner
CREATE POLICY album_tracks_select ON public.album_tracks FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.albums a
    WHERE
      a.id = album_tracks.album_id
      AND (
        a.visibility IN ('public', 'unlisted')
        OR a.owner_id = (auth.jwt()->>'sub')
      )
  )
);

CREATE POLICY album_tracks_insert ON public.album_tracks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.albums a
    WHERE
      a.id = album_tracks.album_id
      AND a.owner_id = (auth.jwt()->>'sub')
  )
);

CREATE POLICY album_tracks_update ON public.album_tracks FOR UPDATE USING (
  EXISTS (
    SELECT 1
    FROM public.albums a
    WHERE
      a.id = album_tracks.album_id
      AND a.owner_id = (auth.jwt()->>'sub')
  )
);

CREATE POLICY album_tracks_delete ON public.album_tracks FOR DELETE USING (
  EXISTS (
    SELECT 1
    FROM public.albums a
    WHERE
      a.id = album_tracks.album_id
      AND a.owner_id = (auth.jwt()->>'sub')
  )
);
