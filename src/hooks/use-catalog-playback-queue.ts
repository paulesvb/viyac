'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { VaultTrackData } from '@/components/VaultPlayer';
import type { DashboardTrack } from '@/lib/dashboard-track-types';
import {
  dashboardTracksMatch,
  indexOfCatalogTrack,
  toVaultTrackData,
} from '@/lib/dashboard-tracks';

export type PlaybackControlAction = 'toggle' | 'stop' | 'previous' | 'next';

type Options = {
  /** Stable server order — never re-sorted client-side. */
  tracks: DashboardTrack[];
  /** Shown before the user picks a row (featured, first album track, etc.). */
  defaultTrack: DashboardTrack | null;
  /** Advance at end / lock-screen next when true. */
  queueEnabled?: boolean;
  /** Suppress autoplay until the user explicitly picks a track. */
  gateAutoplayUntilPick?: boolean;
  loop?: boolean;
  onLoopChange?: (enabled: boolean) => void;
  onPlayingChange?: (playing: boolean) => void;
  /** Parent-owned transport (e.g. `PlaybackControlsCard` above the player). */
  externalPlaybackControl?: {
    action: PlaybackControlAction;
    nonce: number;
  };
};

export function useCatalogPlaybackQueue({
  tracks,
  defaultTrack,
  queueEnabled = true,
  gateAutoplayUntilPick = false,
  loop = false,
  onLoopChange,
  onPlayingChange,
  externalPlaybackControl,
}: Options) {
  const [sessionTrack, setSessionTrack] = useState<DashboardTrack | null>(null);
  const [autoPlayNonce, setAutoPlayNonce] = useState(0);
  const [repeatOne, setRepeatOne] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackControlAction, setPlaybackControlAction] =
    useState<PlaybackControlAction>('toggle');
  const [playbackControlNonce, setPlaybackControlNonce] = useState(0);

  const playerTrack = sessionTrack ?? defaultTrack;
  const hasUserPick = sessionTrack != null;

  const playerTrackRef = useRef<DashboardTrack | null>(null);
  const repeatOneRef = useRef(repeatOne);
  const loopRef = useRef(loop);
  const tracksRef = useRef(tracks);
  const handledTrackControlNonceRef = useRef<number | null>(null);

  useEffect(() => {
    playerTrackRef.current = playerTrack;
    repeatOneRef.current = repeatOne;
    loopRef.current = loop;
    tracksRef.current = tracks;
  }, [playerTrack, repeatOne, loop, tracks]);

  const playTrack = useCallback((track: DashboardTrack) => {
    playerTrackRef.current = track;
    setSessionTrack(track);
    setAutoPlayNonce((n) => n + 1);
  }, []);

  const runPlaybackControl = useCallback((action: PlaybackControlAction) => {
    setPlaybackControlAction(action);
    setPlaybackControlNonce((n) => n + 1);
  }, []);

  const handlePlayingChange = useCallback(
    (playing: boolean) => {
      setIsPlaying(playing);
      onPlayingChange?.(playing);
      if (playing) {
        setSessionTrack((current) => {
          const active = current ?? playerTrackRef.current;
          if (active) playerTrackRef.current = active;
          return active;
        });
        setAutoPlayNonce((n) => (n > 0 ? n : 1));
      }
    },
    [onPlayingChange],
  );

  const handleRowPlayback = useCallback(
    (track: DashboardTrack) => {
      if (playerTrack && dashboardTracksMatch(track, playerTrack)) {
        runPlaybackControl('toggle');
      } else {
        playTrack(track);
      }
    },
    [playerTrack, playTrack, runPlaybackControl],
  );

  const findDashboardTrack = useCallback(
    (vault: VaultTrackData): DashboardTrack | null => {
      const list = tracksRef.current;
      const id = vault.catalog_track_id?.trim();
      if (id) {
        const byId = list.find((t) => t.catalog_track_id === id);
        if (byId) return byId;
      }
      return list.find((t) => t.track_path === vault.track_path) ?? null;
    },
    [],
  );

  const resolveQueueTrack = useCallback(
    (direction: 'next' | 'previous'): VaultTrackData | null => {
      if (!queueEnabled) return null;
      const current = playerTrackRef.current;
      if (!current) return null;
      if (direction === 'next' && repeatOneRef.current) {
        return toVaultTrackData(current);
      }
      const list = tracksRef.current;
      if (list.length === 0) return null;
      const idx = indexOfCatalogTrack(list, current);
      if (idx < 0) return null;

      if (direction === 'next') {
        const next = idx + 1;
        if (next < list.length) return toVaultTrackData(list[next]!);
        if (loopRef.current) return toVaultTrackData(list[0]!);
        return null;
      }

      const previous = idx - 1;
      if (previous >= 0) return toVaultTrackData(list[previous]!);
      if (loopRef.current) return toVaultTrackData(list[list.length - 1]!);
      return null;
    },
    [queueEnabled],
  );

  const resolveNextTrack = useCallback(
    () => resolveQueueTrack('next'),
    [resolveQueueTrack],
  );

  const resolvePreviousTrack = useCallback(
    () => resolveQueueTrack('previous'),
    [resolveQueueTrack],
  );

  const onPlaybackEnded = useCallback(() => {
    if (!queueEnabled) return;
    const current = playerTrackRef.current;
    if (!current) return;
    if (repeatOneRef.current) {
      playTrack(current);
      return;
    }
    const list = tracksRef.current;
    if (list.length === 0) return;
    const idx = indexOfCatalogTrack(list, current);
    if (idx < 0) return;
    const next = idx + 1;
    if (next < list.length) {
      playTrack(list[next]!);
    } else if (loopRef.current) {
      playTrack(list[0]!);
    }
  }, [queueEnabled, playTrack]);

  const onTrackAdvanced = useCallback(
    (vault: VaultTrackData) => {
      const match = findDashboardTrack(vault);
      if (match) {
        playerTrackRef.current = match;
        setSessionTrack(match);
      }
    },
    [findDashboardTrack],
  );

  const skipToNext = useCallback(() => {
    if (!queueEnabled || !playerTrack) return;
    const list = tracksRef.current;
    const idx = indexOfCatalogTrack(list, playerTrack);
    if (idx < 0) return;
    const next = idx + 1;
    if (next < list.length) {
      playTrack(list[next]!);
    } else if (loop) {
      playTrack(list[0]!);
    }
  }, [queueEnabled, playerTrack, loop, playTrack]);

  const skipToPrevious = useCallback(() => {
    if (!queueEnabled || !playerTrack) return;
    const list = tracksRef.current;
    const idx = indexOfCatalogTrack(list, playerTrack);
    if (idx < 0) return;
    const previous = idx - 1;
    if (previous >= 0) {
      playTrack(list[previous]!);
    } else if (loop) {
      playTrack(list[list.length - 1]!);
    }
  }, [queueEnabled, playerTrack, loop, playTrack]);

  useEffect(() => {
    if (!playerTrack) return;
    const action =
      externalPlaybackControl?.action ?? playbackControlAction;
    const nonce = externalPlaybackControl?.nonce ?? playbackControlNonce;
    if (action !== 'previous' && action !== 'next') {
      return;
    }
    if (handledTrackControlNonceRef.current === nonce) return;
    handledTrackControlNonceRef.current = nonce;
    if (action === 'next') {
      skipToNext();
    } else {
      skipToPrevious();
    }
  }, [
    externalPlaybackControl?.action,
    externalPlaybackControl?.nonce,
    playbackControlAction,
    playbackControlNonce,
    playerTrack,
    skipToNext,
    skipToPrevious,
  ]);

  const activeControlAction =
    externalPlaybackControl?.action ?? playbackControlAction;
  const activeControlNonce =
    externalPlaybackControl?.nonce ?? playbackControlNonce;

  const playerControlAction =
    activeControlAction === 'toggle' || activeControlAction === 'stop'
      ? activeControlAction
      : undefined;

  const effectiveAutoPlayNonce =
    gateAutoplayUntilPick && !hasUserPick ? 0 : autoPlayNonce;

  const vaultQueueProps = queueEnabled
    ? {
        onPlaybackEnded,
        resolveNextTrack,
        resolvePreviousTrack,
        onTrackAdvanced,
      }
    : {};

  return {
    playerTrack,
    hasUserPick,
    isPlaying,
    repeatOne,
    setRepeatOne,
    loop,
    setLoop: onLoopChange,
    playTrack,
    handleRowPlayback,
    runPlaybackControl,
    skipToNext,
    skipToPrevious,
    effectiveAutoPlayNonce,
    playerControlAction,
    playbackControlNonce: activeControlNonce,
    handlePlayingChange,
    vaultQueueProps,
  };
}
