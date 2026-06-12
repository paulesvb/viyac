'use client';

import { useAuth } from '@clerk/nextjs';
import { Star } from 'lucide-react';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  getCatalogTrackFavoriteState,
  setCatalogTrackFavorite,
} from '@/actions/track-favorites';
import { isCatalogTrackId } from '@/lib/catalog-track-id';
import { cn } from '@/lib/utils';
import { useTranslate } from '@/hooks/use-translate';

type Props = {
  catalogTrackId: string | undefined;
  className?: string;
};

export function VaultPlayerFavoriteButton({ catalogTrackId, className }: Props) {
  const t = useTranslate();
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [favorited, setFavorited] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pending, startTransition] = useTransition();

  const id = catalogTrackId?.trim();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !isCatalogTrackId(id)) {
      setLoaded(false);
      return;
    }
    let cancelled = false;
    void getCatalogTrackFavoriteState(id).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setFavorited(res.favorited);
        setLoaded(true);
      } else {
        setLoaded(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, id]);

  const onToggle = useCallback(() => {
    if (!isCatalogTrackId(id)) return;
    startTransition(async () => {
      const next = !favorited;
      const res = await setCatalogTrackFavorite(id, next);
      if (res.ok) {
        setFavorited(res.favorited);
        router.refresh();
      }
    });
  }, [favorited, id, router]);

  if (!isLoaded || !isSignedIn || !isCatalogTrackId(id)) return null;

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!loaded || pending}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition',
        favorited
          ? 'border-amber-400/50 bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/30'
          : 'border-white/15 bg-white/5 text-zinc-300 hover:border-[#00f2ff]/35 hover:bg-white/10 hover:text-white',
        className,
      )}
      aria-pressed={favorited}
      aria-label={favorited ? t('ctaRemoveFavorite') : t('ctaAddFavorite')}
    >
      <Star
        className={cn('h-3.5 w-3.5', favorited ? 'fill-amber-300 text-amber-200' : '')}
        strokeWidth={2}
      />
      {favorited ? t('ctaFavorited') : t('ctaFavorite')}
    </button>
  );
}
