'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { setCatalogTrackViewerGrant } from '@/actions/track-viewer-grants';
import type { AdminUserOption } from '@/lib/profiles-admin-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  trackId: string;
  ownerId: string | null;
  users: AdminUserOption[];
  initialGrantedIds: string[];
  searchQuery: string;
};

export function TrackViewerGrantsForm({
  trackId,
  ownerId,
  users,
  initialGrantedIds,
  searchQuery,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [granted, setGranted] = useState<Set<string>>(
    () => new Set(initialGrantedIds),
  );
  const [message, setMessage] = useState<string | null>(null);

  const toggle = useCallback(
    (viewerUserId: string, next: boolean) => {
      setMessage(null);
      startTransition(async () => {
        const result = await setCatalogTrackViewerGrant(
          trackId,
          viewerUserId,
          next,
        );
        if (result.ok) {
          setGranted((prev) => {
            const n = new Set(prev);
            if (next) n.add(viewerUserId);
            else n.delete(viewerUserId);
            return n;
          });
          router.refresh();
        } else {
          setMessage(result.error);
        }
      });
    },
    [trackId, router],
  );

  return (
    <div className="space-y-6">
      <form
        method="get"
        className="flex max-w-md flex-col gap-2 sm:flex-row sm:items-end"
        action=""
      >
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="user-search">Search users</Label>
          <Input
            id="user-search"
            name="q"
            type="search"
            placeholder="Name or email"
            defaultValue={searchQuery}
          />
        </div>
        <Button type="submit" variant="secondary" disabled={pending}>
          Search
        </Button>
      </form>

      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No profiles match. Try another search or confirm rows exist in{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">profiles</code>.
          Local sign-in rows show a Dev badge when{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">is_dev</code> is
          true.
        </p>
      ) : (
        <ul className="max-w-2xl divide-y divide-border rounded-lg border border-border">
          {users.map((u) => {
            const isOwner = Boolean(ownerId && u.id === ownerId);
            const checked = isOwner || granted.has(u.id);
            return (
              <li
                key={u.id}
                className="flex flex-wrap items-center gap-3 px-3 py-3 sm:flex-nowrap"
              >
                <input
                  id={`grant-${u.id}`}
                  type="checkbox"
                  className="h-4 w-4 shrink-0 rounded border-input"
                  checked={checked}
                  disabled={pending || isOwner}
                  onChange={(e) => toggle(u.id, e.target.checked)}
                />
                <label
                  htmlFor={`grant-${u.id}`}
                  className="min-w-0 flex-1 cursor-pointer"
                >
                  <span className="font-medium text-foreground">{u.label}</span>
                  {u.email && u.email !== u.label ? (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {u.email}
                    </span>
                  ) : null}
                  <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground/80">
                    {u.id}
                  </span>
                </label>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                  {u.isDev ? (
                    <span className="rounded-full border border-amber-500/50 bg-amber-950/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-200/95">
                      Dev
                    </span>
                  ) : null}
                  {isOwner ? (
                    <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Owner
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {message ? (
        <p className="text-sm text-destructive" role="alert">
          {message}
        </p>
      ) : null}

      <p className="max-w-xl text-xs text-muted-foreground">
        Checked users can open the track and see it on Home when catalog
        visibility is private (or unlisted without other access). Public tracks
        stay visible to everyone regardless of this list. Platform admins always
        see all tracks on Home. User IDs match Clerk and{' '}
        <code className="rounded bg-muted px-0.5 text-[10px]">profiles.id</code>.
      </p>
    </div>
  );
}
