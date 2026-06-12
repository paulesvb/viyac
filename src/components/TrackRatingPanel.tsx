'use client';

import { useUser } from '@clerk/nextjs';
import { useCallback, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';
import { isCatalogTrackId } from '@/lib/catalog-track-id';

type RatingState = {
  listened_seconds_total: number;
  threshold_seconds: number;
  eligible: boolean;
  rating: number | null;
};

type TrackRatingPanelProps = {
  catalogTrackId: string;
  className?: string;
};

function formatSec(s: number): string {
  if (!Number.isFinite(s) || s < 0) return '0';
  return s < 60 ? `${Math.ceil(s)}s` : `${Math.ceil(s / 60)}m`;
}

export function TrackRatingPanel({
  catalogTrackId,
  className,
}: TrackRatingPanelProps) {
  const { isSignedIn } = useUser();
  const [state, setState] = useState<RatingState | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    if (!isCatalogTrackId(catalogTrackId)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/catalog/tracks/${encodeURIComponent(catalogTrackId)}/rating`,
        { credentials: 'include' },
      );
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? res.statusText);
      }
      const j = (await res.json()) as RatingState;
      setState(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load rating');
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [catalogTrackId]);

  useEffect(() => {
    if (!isSignedIn || !isCatalogTrackId(catalogTrackId)) return;
    void fetchState();
  }, [isSignedIn, catalogTrackId, fetchState]);

  useEffect(() => {
    if (!isCatalogTrackId(catalogTrackId)) return;
    const onListen = (ev: Event) => {
      const d = (ev as CustomEvent<{ trackId?: string }>).detail;
      if (d?.trackId === catalogTrackId) void fetchState();
    };
    window.addEventListener('viyac:catalog-listen', onListen);
    return () => window.removeEventListener('viyac:catalog-listen', onListen);
  }, [catalogTrackId, fetchState]);

  const setRating = async (rating: number) => {
    if (!isCatalogTrackId(catalogTrackId)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/catalog/tracks/${encodeURIComponent(catalogTrackId)}/rating`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating }),
        },
      );
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        rating?: number;
        listened_seconds_total?: number;
        threshold_seconds?: number;
        eligible?: boolean;
      };
      if (!res.ok) {
        throw new Error(j.error ?? res.statusText);
      }
      setState({
        listened_seconds_total: j.listened_seconds_total ?? 0,
        threshold_seconds: j.threshold_seconds ?? 0,
        eligible: j.eligible ?? true,
        rating: j.rating ?? rating,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  if (!isCatalogTrackId(catalogTrackId)) return null;

  if (!isSignedIn) {
    return (
      <p className={cn('text-muted-foreground text-sm', className)}>
        Sign in to log listens and rate this track.
      </p>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground font-mono text-xs uppercase tracking-wider">
          Your rating
        </span>
        {loading && !state ? (
          <span className="text-muted-foreground text-xs">Loading…</span>
        ) : null}
      </div>

      {state && !state.eligible ? (
        <p className="text-muted-foreground max-w-md text-xs leading-relaxed">
          Listen a bit longer to unlock your personal rating (
          {formatSec(state.listened_seconds_total)} / {formatSec(state.threshold_seconds)}).
        </p>
      ) : null}

      {state?.eligible ? (
        <div className="flex items-center gap-1" role="group" aria-label="Rate 1 to 5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              disabled={saving}
              onClick={() => void setRating(n)}
              className={cn(
                'font-mono text-xs tabular-nums transition-colors',
                'rounded-md border px-2 py-1',
                state.rating === n
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground',
              )}
              aria-pressed={state.rating === n}
            >
              {n}
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
