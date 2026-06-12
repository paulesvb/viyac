-- Optional short label shown on Home collection cards (copy is DB-driven per album).
ALTER TABLE api.albums
  ADD COLUMN IF NOT EXISTS card_badge_label text;

COMMENT ON COLUMN api.albums.card_badge_label IS
  'Optional badge copy on Home collection cards; omit or NULL to hide.';
