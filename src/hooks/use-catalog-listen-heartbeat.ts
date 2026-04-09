'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';

import { isCatalogTrackId } from '@/lib/catalog-track-id';

const HEARTBEAT_MS = 14000;

async function postListenIncrement(trackId: string, increment_seconds: number) {
  try {
    const res = await fetch(
      `/api/catalog/tracks/${encodeURIComponent(trackId)}/listen`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ increment_seconds }),
      },
    );
    if (res.ok) {
      window.dispatchEvent(
        new CustomEvent('viyac:catalog-listen', { detail: { trackId } }),
      );
    }
  } catch {
    /* offline / transient */
  }
}

/**
 * While signed in and `catalogTrackId` is set, reports wall-clock seconds listened during playback
 * (heartbeat + flush on pause/unmount) for rating eligibility.
 * When signed out, the same path runs if `allowAnonymousListen` and catalog id are set (anonymous stats).
 */
export function useCatalogListenHeartbeat(opts: {
  catalogTrackId: string | undefined;
  playing: boolean;
  trackKey: string;
  allowAnonymousListen?: boolean;
}) {
  const { isSignedIn, isLoaded } = useUser();
  const lastAnchorRef = useRef<number | null>(null);

  useEffect(() => {
    lastAnchorRef.current = null;
  }, [opts.trackKey, opts.catalogTrackId]);

  useEffect(() => {
    if (!isLoaded) return;

    const trackId = opts.catalogTrackId;
    if (!isCatalogTrackId(trackId)) return;

    const allow =
      isSignedIn || Boolean(opts.allowAnonymousListen);
    if (!allow) return;

    if (!opts.playing) {
      const anchor = lastAnchorRef.current;
      lastAnchorRef.current = null;
      if (anchor != null) {
        const sec = (performance.now() - anchor) / 1000;
        if (sec >= 0.5) {
          void postListenIncrement(trackId, Math.min(45, sec));
        }
      }
      return;
    }

    if (lastAnchorRef.current === null) {
      lastAnchorRef.current = performance.now();
    }

    const interval = window.setInterval(() => {
      const anchor = lastAnchorRef.current;
      if (anchor == null) return;
      const now = performance.now();
      const sec = (now - anchor) / 1000;
      lastAnchorRef.current = now;
      if (sec >= 0.5) {
        void postListenIncrement(trackId, Math.min(45, sec));
      }
    }, HEARTBEAT_MS);

    return () => {
      window.clearInterval(interval);
      const anchor = lastAnchorRef.current;
      lastAnchorRef.current = null;
      if (anchor != null) {
        const sec = (performance.now() - anchor) / 1000;
        if (sec >= 0.5) {
          void postListenIncrement(trackId, Math.min(45, sec));
        }
      }
    };
  }, [
    isLoaded,
    isSignedIn,
    opts.allowAnonymousListen,
    opts.catalogTrackId,
    opts.playing,
  ]);
}
