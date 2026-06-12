import { cn } from '@/lib/utils';

type Props = {
  label: string;
  className?: string;
};

/** Overlay pill for collection cards; `label` comes from `api.albums.card_badge_label`. */
export function CollectionCardBadge({ label, className }: Props) {
  const text = label.trim();
  if (!text) return null;

  return (
    <span
      className={cn(
        'absolute right-2 top-2 z-10 inline-flex max-w-[calc(100%-1rem)] truncate rounded-full border border-cyan-400/40 bg-zinc-950/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-100 shadow-sm backdrop-blur-sm',
        className,
      )}
    >
      {text}
    </span>
  );
}
