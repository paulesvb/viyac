'use client';

import Link from 'next/link';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import {
  useCallback,
  useRef,
  useState,
  useTransition,
  type DragEvent,
} from 'react';
import { reorderAlbumTracks } from '@/actions/admin-catalog';
import type { AdminAlbumTrackRow } from '@/lib/admin-catalog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type Props = {
  albumId: string;
  initialTracks: AdminAlbumTrackRow[];
};

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }
  const next = [...items];
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed);
  return next;
}

export function AlbumTrackOrderForm({ albumId, initialTracks }: Props) {
  const [tracks, setTracks] = useState(initialTracks);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dragIndexRef = useRef<number | null>(null);

  const persistOrder = useCallback(
    (nextTracks: AdminAlbumTrackRow[], previousTracks: AdminAlbumTrackRow[]) => {
      setTracks(nextTracks);
      setMessage(null);
      startTransition(async () => {
        const result = await reorderAlbumTracks(
          albumId,
          nextTracks.map((t) => t.track_id),
        );
        if (!result.ok) {
          setMessage(result.error);
          setTracks(previousTracks);
        }
      });
    },
    [albumId],
  );

  const moveTrack = useCallback(
    (from: number, to: number) => {
      const next = moveItem(tracks, from, to);
      if (next === tracks) return;
      persistOrder(next, tracks);
    },
    [tracks, persistOrder],
  );

  const onDragStart = (index: number) => (e: DragEvent<HTMLLIElement>) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const onDragOver = (e: DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (toIndex: number) => (e: DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    const fromIndex = dragIndexRef.current;
    dragIndexRef.current = null;
    if (fromIndex == null || fromIndex === toIndex) return;
    moveTrack(fromIndex, toIndex);
  };

  const onDragEnd = () => {
    dragIndexRef.current = null;
  };

  if (tracks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">No tracks in this album</CardTitle>
          <CardDescription>
            Assign tracks from{' '}
            <Link href="/admin/tracks" className="text-cyan-400/90 underline-offset-4 hover:underline">
              track publishing
            </Link>{' '}
            (set placement to this album).
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Drag tracks or use the arrows to reorder. Changes save automatically and
        apply on the public collection page.
      </p>

      <ol className="space-y-2">
        {tracks.map((track, index) => (
          <li
            key={track.track_id}
            draggable={!pending}
            onDragStart={onDragStart(index)}
            onDragOver={onDragOver}
            onDrop={onDrop(index)}
            onDragEnd={onDragEnd}
            className="list-none"
          >
            <Card className={pending ? 'opacity-70' : undefined}>
              <CardContent className="flex items-center gap-2 p-3 sm:gap-3">
                <span
                  className="cursor-grab text-muted-foreground active:cursor-grabbing"
                  aria-hidden
                >
                  <GripVertical className="size-4" />
                </span>
                <span className="w-6 shrink-0 text-center text-xs font-medium text-muted-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{track.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    <code>{track.slug}</code>
                    <span className="mx-1.5">·</span>
                    {track.visibility}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    disabled={pending || index === 0}
                    aria-label={`Move ${track.title} up`}
                    onClick={() => moveTrack(index, index - 1)}
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    disabled={pending || index === tracks.length - 1}
                    aria-label={`Move ${track.title} down`}
                    onClick={() => moveTrack(index, index + 1)}
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                  <Button size="sm" variant="secondary" asChild>
                    <Link href={`/admin/tracks/${track.track_id}`}>Edit</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>

      {message ? (
        <p className="text-sm text-destructive" role="alert">
          {message}
        </p>
      ) : pending ? (
        <p className="text-sm text-muted-foreground">Saving order…</p>
      ) : null}
    </div>
  );
}
