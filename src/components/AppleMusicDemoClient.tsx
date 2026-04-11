'use client';

import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

const MUSICKIT_SCRIPT_SRC =
  'https://js-cdn.music.apple.com/musickit/v3/musickit.js';

function getDemoSongId(): string | null {
  const id = process.env.NEXT_PUBLIC_APPLE_MUSIC_DEMO_SONG_ID?.trim();
  return id && id.length > 0 ? id : null;
}

function musickitAppName(): string {
  return process.env.NEXT_PUBLIC_MUSICKIT_APP_NAME?.trim() || 'Viyac';
}

function musickitBuild(): string {
  return process.env.NEXT_PUBLIC_MUSICKIT_BUILD?.trim() || '1.0.0';
}

function loadMusicKit(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('No window'));
  }
  if (window.MusicKit) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const onLoaded = () => {
      if (window.MusicKit) resolve();
      else reject(new Error('MusicKit missing after load event'));
    };

    document.addEventListener('musickitloaded', onLoaded, { once: true });

    const existing = document.querySelector(
      `script[src="${MUSICKIT_SCRIPT_SRC}"]`,
    );
    if (!existing) {
      const script = document.createElement('script');
      script.src = MUSICKIT_SCRIPT_SRC;
      script.async = true;
      script.onerror = () => {
        document.removeEventListener('musickitloaded', onLoaded);
        reject(new Error('Failed to load MusicKit script'));
      };
      document.body.appendChild(script);
      return;
    }

    if (window.MusicKit) {
      document.removeEventListener('musickitloaded', onLoaded);
      resolve();
      return;
    }

    const iv = window.setInterval(() => {
      if (window.MusicKit) {
        window.clearInterval(iv);
        document.removeEventListener('musickitloaded', onLoaded);
        resolve();
      }
    }, 50);
    window.setTimeout(() => {
      window.clearInterval(iv);
      document.removeEventListener('musickitloaded', onLoaded);
      if (window.MusicKit) resolve();
      else reject(new Error('MusicKit did not become available'));
    }, 8000);
  });
}

export function AppleMusicDemoClient() {
  const { isLoaded, isSignedIn } = useAuth();
  const [kitError, setKitError] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [busy, setBusy] = useState(false);
  const musicRef = useRef<MusicKitInstance | null>(null);
  const demoSongId = getDemoSongId();

  useEffect(() => {
    let cancelled = false;
    loadMusicKit()
      .then(() => {
        if (!cancelled) setSdkReady(true);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setKitError(e instanceof Error ? e.message : 'MusicKit load failed');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const configure = useCallback(async () => {
    if (!window.MusicKit) {
      setKitError('MusicKit is not available');
      return;
    }
    setBusy(true);
    setKitError(null);
    try {
      const res = await fetch('/api/apple-music/developer-token');
      const data = (await res.json()) as {
        token?: string;
        error?: string;
        hint?: string;
      };
      if (!res.ok) {
        const msg = [data.error, data.hint].filter(Boolean).join(' — ');
        throw new Error(msg || res.statusText);
      }
      if (!data.token) {
        throw new Error('No token in response');
      }
      await window.MusicKit.configure({
        developerToken: data.token,
        app: {
          name: musickitAppName(),
          build: musickitBuild(),
        },
      });
      musicRef.current = window.MusicKit.getInstance();
      setConfigured(true);
      setAuthorized(musicRef.current.isAuthorized);
    } catch (e: unknown) {
      setKitError(e instanceof Error ? e.message : 'Configure failed');
    } finally {
      setBusy(false);
    }
  }, []);

  const authorize = useCallback(async () => {
    const music = musicRef.current;
    if (!music) return;
    setBusy(true);
    setKitError(null);
    try {
      await music.authorize();
      setAuthorized(music.isAuthorized);
    } catch (e: unknown) {
      setKitError(e instanceof Error ? e.message : 'Authorization failed');
    } finally {
      setBusy(false);
    }
  }, []);

  const playDemo = useCallback(async () => {
    const music = musicRef.current;
    if (!music || !demoSongId) return;
    setBusy(true);
    setKitError(null);
    try {
      await music.setQueue({ song: demoSongId });
      await music.play();
    } catch (e: unknown) {
      setKitError(e instanceof Error ? e.message : 'Playback failed');
    } finally {
      setBusy(false);
    }
  }, [demoSongId]);

  if (!isLoaded) {
    return (
      <p className="text-sm text-muted-foreground">Loading session…</p>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Sign in to request a developer token and try MusicKit playback.
        </p>
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Load MusicKit (automatic).</li>
        <li>Configure with a server-signed developer token.</li>
        <li>Authorize Apple Music on this device.</li>
        <li>Play the demo catalog song (requires Apple Music subscription for full playback where applicable).</li>
      </ol>

      {kitError ? (
        <p className="text-sm text-red-400" role="alert">
          {kitError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={!sdkReady || busy || configured}
          onClick={() => void configure()}
        >
          {configured ? 'Configured' : 'Configure MusicKit'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={!configured || busy || authorized}
          onClick={() => void authorize()}
        >
          {authorized ? 'Authorized' : 'Authorize Apple Music'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={
            !configured || !authorized || !demoSongId || busy
          }
          onClick={() => void playDemo()}
        >
          Play demo song
        </Button>
      </div>

      {!sdkReady && !kitError ? (
        <p className="text-xs text-muted-foreground">Loading MusicKit…</p>
      ) : null}

      {!demoSongId ? (
        <p className="text-xs text-amber-200/90">
          Set{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
            NEXT_PUBLIC_APPLE_MUSIC_DEMO_SONG_ID
          </code>{' '}
          to an Apple Music catalog song id (e.g. from the Apple Music app share link).
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Demo song id:{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
            {demoSongId}
          </code>
        </p>
      )}
    </div>
  );
}
