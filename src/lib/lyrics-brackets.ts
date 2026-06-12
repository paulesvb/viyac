/**
 * Plain-text lyrics with section tags on their own line, e.g. `[VERSE]`, `[CHORUS 2]`.
 * Lines that do not match this pattern are lyric body (including `[oops}` mid-line).
 */
const SECTION_TAG_LINE = /^\s*\[([A-Za-z][A-Za-z0-9 _-]*)\]\s*$/;

export type ParsedLyricsSection = {
  /** Uppercase normalized tag, or null for lines before the first tag. */
  tag: string | null;
  /** Lines in order; empty strings preserve stanza gaps (`white-space: pre-line`). */
  lines: string[];
};

function normalizeTag(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split raw stored lyrics into sections. */
export function parseBracketSectionLyrics(raw: string | null | undefined): ParsedLyricsSection[] {
  if (raw == null || !String(raw).trim()) return [];
  const lines = String(raw).replace(/\r\n/g, '\n').split('\n');
  const out: ParsedLyricsSection[] = [];
  let tag: string | null = null;
  let buf: string[] = [];

  const flush = () => {
    const hasText = buf.some((l) => l.trim().length > 0);
    if (!hasText && tag === null) {
      buf = [];
      return;
    }
    if (!hasText && tag !== null) {
      buf = [];
      return;
    }
    out.push({ tag, lines: [...buf] });
    buf = [];
  };

  for (const line of lines) {
    const m = line.match(SECTION_TAG_LINE);
    if (m) {
      flush();
      tag = normalizeTag(m[1]);
    } else {
      buf.push(line);
    }
  }
  flush();
  return out;
}

/** Title-style heading for a section tag (VERSE 2 → Verse 2). */
export function formatLyricsSectionHeading(tag: string | null): string | null {
  if (!tag?.trim()) return null;
  return tag
    .toLowerCase()
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) return part;
      if (!part) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
}
