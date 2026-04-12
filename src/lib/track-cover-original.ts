import 'server-only';

import { isCatalogTrackId } from '@/lib/catalog-track-id';
import { createServiceCatalog } from '@/lib/supabase-catalog';

type CatalogClient = ReturnType<typeof createServiceCatalog>;

function trimOrEmpty(s: string | undefined): string {
  return s?.trim() ?? '';
}

export type ResolveCoverOriginalInput = {
  isCover: boolean;
  originalTrackIdRaw: string;
  /** When set, reject if the chosen original is this id (e.g. track cannot cover itself). */
  disallowSameAsTrackId?: string;
};

/**
 * Validates cover flags for insert/update: Genesis-only originals, not covers-of-covers,
 * and optional “not self” rule. Returns DB values for `is_cover` / `original_track_id`.
 */
export async function resolveCoverOriginalForDb(
  supabase: CatalogClient,
  input: ResolveCoverOriginalInput,
): Promise<
  | { ok: true; isCover: boolean; originalTrackId: string | null }
  | { ok: false; error: string }
> {
  const isCover = Boolean(input.isCover);
  const originalId = trimOrEmpty(input.originalTrackIdRaw);
  const selfId = trimOrEmpty(input.disallowSameAsTrackId);

  if (isCover) {
    if (!isCatalogTrackId(originalId)) {
      return {
        ok: false,
        error: 'Select a Genesis original for this cover.',
      };
    }
    if (selfId && originalId === selfId) {
      return {
        ok: false,
        error: 'A track cannot be a cover of itself.',
      };
    }

    const { data: origRow, error: origErr } = await supabase
      .from('tracks')
      .select('id, provenance_type, original_track_id')
      .eq('id', originalId)
      .maybeSingle();

    if (origErr || !origRow) {
      return { ok: false, error: 'Original track not found.' };
    }

    const o = origRow as {
      provenance_type: string | null;
      original_track_id: string | null;
    };
    if (o.provenance_type !== 'genesis') {
      return {
        ok: false,
        error: 'Cover originals must be Genesis (GENESIS) tracks only.',
      };
    }
    if (o.original_track_id != null) {
      return {
        ok: false,
        error: 'Cannot point a cover at another cover; pick a Genesis original.',
      };
    }
    return { ok: true, isCover: true, originalTrackId: originalId };
  }

  if (originalId) {
    return {
      ok: false,
      error: 'Clear the original track or enable “This is a cover”.',
    };
  }

  return { ok: true, isCover: false, originalTrackId: null };
}
