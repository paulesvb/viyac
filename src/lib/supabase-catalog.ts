import { createServiceSupabase } from '@/lib/supabase-service';

/** Catalog, listen progress, and ratings tables live in this schema (see Supabase migrations). */
export const CATALOG_SCHEMA = 'api' as const;

/** Service-role client scoped to `api` (tracks, albums, ratings, etc.). Server-only. */
export function createServiceCatalog() {
  return createServiceSupabase().schema(CATALOG_SCHEMA);
}

/**
 * PostgREST returns e.g. `Invalid schema: api` when the schema is missing from
 * Project Settings → API → Exposed schemas (applies to service role too).
 */
export function formatCatalogPostgrestError(
  message: string | undefined,
  emptyFallback = 'Request failed.',
): string {
  const msg = message?.trim() || emptyFallback;
  if (/invalid schema/i.test(msg)) {
    return `Catalog API schema "${CATALOG_SCHEMA}" is not exposed on this Supabase project. Open Project Settings → API → Exposed schemas, add "${CATALOG_SCHEMA}", save, then retry.`;
  }
  return msg;
}

