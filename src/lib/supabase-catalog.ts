import { createServiceSupabase } from '@/lib/supabase-service';

/** Catalog, listen progress, and ratings tables live in this schema (see Supabase migrations). */
export const CATALOG_SCHEMA = 'api' as const;

/** Service-role client scoped to `api` (tracks, albums, ratings, etc.). Server-only. */
export function createServiceCatalog() {
  return createServiceSupabase().schema(CATALOG_SCHEMA);
}
