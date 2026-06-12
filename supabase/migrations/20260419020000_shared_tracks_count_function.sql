-- SQL helper for navbar Shared (N): count visible shared tracks per viewer.

CREATE OR REPLACE FUNCTION api.count_visible_shared_tracks_for_viewer(
  p_viewer_user_id text
)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(COUNT(*), 0)::integer
  FROM (
    SELECT DISTINCT v.track_id
    FROM api.catalog_track_viewers v
    WHERE v.viewer_user_id = p_viewer_user_id
      AND NOT EXISTS (
        SELECT 1
        FROM api.catalog_track_viewer_hides h
        WHERE h.track_id = v.track_id
          AND h.viewer_user_id = p_viewer_user_id
      )
  ) shared_rows;
$$;

COMMENT ON FUNCTION api.count_visible_shared_tracks_for_viewer(text) IS
  'Returns visible shared-track count for a viewer (grants minus hides).';

GRANT EXECUTE ON FUNCTION api.count_visible_shared_tracks_for_viewer(text)
  TO postgres, service_role, authenticated, anon;
