-- Kill switch for signed-out collection playback.
-- enabled = false (default): collection pages require sign-in; anonymous vault
--   playback stays limited to anonymous_visible / show_home tracks.
-- enabled = true: public and unlisted collections (and every track on them)
--   are readable without an account. Favorites stay signed-in only.
--
--   UPDATE api.feature_flags
--   SET enabled = true, updated_at = now()
--   WHERE key = 'anonymous_collection_access';

CREATE TABLE IF NOT EXISTS api.feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE api.feature_flags IS
  'App kill switches read by the Next.js service role. Flip enabled to restore or open a behavior.';

INSERT INTO api.feature_flags (key, enabled)
VALUES ('anonymous_collection_access', false)
ON CONFLICT (key) DO NOTHING;

GRANT ALL ON TABLE api.feature_flags TO postgres, service_role;

ALTER TABLE api.feature_flags ENABLE ROW LEVEL SECURITY;
