import { cn } from '@/lib/utils';
import {
  type ProvenanceType,
  PROVENANCE_META,
  isProvenanceType,
} from '@/lib/provenance';

const variantClass: Record<ProvenanceType, string> = {
  genesis:
    'border border-amber-500/85 bg-amber-500/[0.05] text-amber-950 shadow-[0_0_10px_rgba(245,158,11,0.18)] dark:border-cyan-400/75 dark:bg-cyan-400/[0.06] dark:text-cyan-50 dark:shadow-[0_0_12px_rgba(34,211,238,0.2)]',
  hybrid:
    'border border-zinc-300/95 bg-white/50 text-zinc-900 dark:border-white/30 dark:bg-white/[0.04] dark:text-zinc-100',
  echo: 'border border-dashed border-zinc-400/75 text-zinc-500 dark:border-zinc-500/45 dark:text-zinc-400',
};

type ProvenanceBadgeProps = {
  type: ProvenanceType | string | null | undefined;
  className?: string;
  /** When false, only the label is shown (e.g. dense track cards). Default true. */
  showTooltip?: boolean;
};

/**
 * Small retrofuturist pill for track provenance; hover or focus shows chain-of-creation copy.
 * Wire next to track titles when the catalog UI lands.
 */
export function ProvenanceBadge({
  type,
  className,
  showTooltip = true,
}: ProvenanceBadgeProps) {
  if (type == null || !isProvenanceType(type)) return null;

  const meta = PROVENANCE_META[type];

  const label = (
    <span
      tabIndex={showTooltip ? 0 : undefined}
      className={cn(
        'inline-flex cursor-default items-center rounded-full border px-1.5 py-px font-mono text-[10px] font-medium uppercase tracking-[0.14em] outline-none transition-colors',
        showTooltip &&
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        variantClass[type],
      )}
    >
      {meta.label}
    </span>
  );

  if (!showTooltip) {
    return (
      <span className={cn('inline-flex shrink-0 align-middle', className)}>
        {label}
      </span>
    );
  }

  return (
    <span className={cn('group relative inline-flex shrink-0 align-middle', className)}>
      {label}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-50 max-w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 whitespace-normal rounded-md border border-border bg-popover px-2.5 py-1.5 text-center font-sans text-[11px] leading-snug text-popover-foreground shadow-md',
          'opacity-0 transition-opacity duration-150',
          'group-hover:opacity-100 group-focus-visible:opacity-100',
        )}
      >
        {meta.chain}
      </span>
    </span>
  );
}
