'use client';

import { formatLyricsSectionHeading, parseBracketSectionLyrics } from '@/lib/lyrics-brackets';

type Props = {
  lyrics?: string | null | undefined;
  /** Optional writer credit (e.g. name). */
  lyricsBy?: string | null | undefined;
  className?: string;
  /** Dark vault card (cyan/violet accents on zinc). */
  variant?: 'default' | 'vault';
};

/**
 * Renders catalog lyrics: `[TAG]` on its own line opens a section; body uses `pre-line`.
 * Optional `lyricsBy` attribution under the “Lyrics” heading.
 */
export function LyricsDisplay({
  lyrics,
  lyricsBy,
  className,
  variant = 'default',
}: Props) {
  const raw = lyrics?.trim() ?? '';
  const by = lyricsBy?.trim() ?? '';
  if (!raw && !by) return null;

  const sections = parseBracketSectionLyrics(lyrics);
  const visible = sections
    .map((sec, i) => {
      const heading = formatLyricsSectionHeading(sec.tag);
      const body = sec.lines.join('\n').trimEnd();
      if (!body && !heading) return null;
      return { sec, i, heading, body };
    })
    .filter(
      (x): x is NonNullable<typeof x> => x !== null,
    );

  const vault = variant === 'vault';
  const h2Class = vault
    ? 'mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500'
    : 'mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground';
  const bylineClass = vault
    ? 'mb-4 text-sm text-zinc-400'
    : 'mb-4 text-sm text-muted-foreground';
  const h3Class = vault
    ? 'text-xs font-semibold uppercase tracking-wider text-violet-200/90'
    : 'text-xs font-semibold uppercase tracking-wider text-[#7b2eff]/90';
  const pClass = vault
    ? 'whitespace-pre-line text-base leading-relaxed text-zinc-200'
    : 'whitespace-pre-line text-base leading-relaxed text-foreground/95';

  const byline = by ? (
    <p className={bylineClass}>
      Lyrics by <span className="text-foreground/90">{by}</span>
    </p>
  ) : null;

  if (!raw) {
    return (
      <div className={className}>
        <h2 className={h2Class}>Lyrics</h2>
        {byline}
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className={className}>
        <h2 className={h2Class}>Lyrics</h2>
        {byline}
        <p className={pClass}>{raw}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <h2 className={h2Class}>Lyrics</h2>
      {byline}
      <div className="space-y-8">
        {visible.map(({ sec, i, heading, body }) => (
          <section
            key={`${sec.tag ?? 'preamble'}-${i}`}
            className="space-y-2"
          >
            {heading ? (
              <h3 className={h3Class}>
                {heading}
              </h3>
            ) : null}
            {body ? (
              <p className={pClass}>
                {body}
              </p>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
