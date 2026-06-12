import type { DashboardTrack } from '@/lib/dashboard-track-types';

/** Normalize Postgres text[] / JSON array from Supabase into trimmed strings. */
export function normalizeTagList(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) {
    return v
      .filter((x): x is string => typeof x === 'string')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/** Comma/semicolon-separated tags → lowercase slug tokens for `genres` / `instruments`. */
export function parseCommaSeparatedTags(raw: string): string[] {
  return raw
    .split(/[,;]+/)
    .map((s) =>
      s
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, ''),
    )
    .filter(Boolean);
}

export function formatTagLabel(slug: string): string {
  const t = slug.trim();
  if (!t) return '';
  return t
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** `release_date` ISO `YYYY-MM-DD` (store 1st of month) → "Apr 2026". */
export function formatReleaseMonthYear(
  isoDate: string | undefined | null,
): string | null {
  if (!isoDate?.trim()) return null;
  const d = new Date(`${isoDate.trim()}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function formatDurationMs(ms: number | undefined | null): string | null {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return null;
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export type CompactTrackMetaOptions = {
  /** When false, omits catalog duration (e.g. player shows live time on the waveform). Default true. */
  includeDuration?: boolean;
};

/**
 * One line for cards and player: release · duration · genre tags · +N.
 * Instruments stay on their own line.
 */
export function buildCompactTrackMetaLine(
  track: Pick<DashboardTrack, 'release_date' | 'duration_ms' | 'genres'>,
  options?: CompactTrackMetaOptions,
): string | null {
  const includeDuration = options?.includeDuration !== false;
  const parts: string[] = [];
  const rel = formatReleaseMonthYear(track.release_date);
  if (rel) parts.push(rel);
  if (includeDuration) {
    const dur = formatDurationMs(track.duration_ms);
    if (dur) parts.push(dur);
  }

  const genreLabels = normalizeTagList(track.genres).map(formatTagLabel);
  const maxTags = 3;
  parts.push(...genreLabels.slice(0, maxTags));
  const extra = genreLabels.length - maxTags;
  if (extra > 0) parts.push(`+${extra}`);


  return parts.length > 0 ? parts.join(' · ') : null;
}

export type TrackCardSecondLine =
  | { kind: 'description'; text: string }
  | { kind: 'album'; text: string };

/**
 * Second line on track cards: catalog singles → English description when set;
 * album tracks (`is_single === false`) → album title; static/unknown tracks fall back to description.
 */
export function getTrackCardSecondLine(
  track: DashboardTrack,
): TrackCardSecondLine | null {
  if (track.is_single === false) {
    const t = track.album_title?.trim();
    if (t) return { kind: 'album', text: t };
    return null;
  }
  const d = track.description_en?.trim();
  if (d) return { kind: 'description', text: d };
  return null;
}
