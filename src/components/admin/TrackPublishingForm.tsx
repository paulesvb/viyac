'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import Link from 'next/link';
import { updateTrackPublishingFields } from '@/actions/admin-catalog';
import type { TrackPublishingInput } from '@/actions/admin-catalog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { CatalogTrackRow } from '@/lib/catalog-types';

type Props = {
  trackId: string;
  slug: string;
  initial: TrackPublishingInput;
};

export function TrackPublishingForm({ trackId, slug, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [visibility, setVisibility] =
    useState<CatalogTrackRow['visibility']>(initial.visibility);
  const [featured, setFeatured] = useState(initial.featured);
  const [anonymousVisible, setAnonymousVisible] = useState(
    initial.anonymous_visible,
  );
  const [showInHomeMore, setShowInHomeMore] = useState(
    initial.show_in_home_more_tracks,
  );

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setMessage(null);
      startTransition(async () => {
        const result = await updateTrackPublishingFields(trackId, slug, {
          visibility,
          featured,
          anonymous_visible: anonymousVisible,
          show_in_home_more_tracks: showInHomeMore,
        });
        if (result.ok) {
          setMessage('Saved.');
          router.refresh();
        } else {
          setMessage(result.error);
        }
      });
    },
    [
      trackId,
      slug,
      visibility,
      featured,
      anonymousVisible,
      showInHomeMore,
      router,
    ],
  );

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-6">
      <div className="space-y-2">
        <Label htmlFor="visibility">Catalog visibility</Label>
        <select
          id="visibility"
          value={visibility}
          onChange={(e) =>
            setVisibility(e.target.value as CatalogTrackRow['visibility'])
          }
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="private">Private (only you / explicit grants)</option>
          <option value="unlisted">Unlisted (direct link; not promoted)</option>
          <option value="public">Public (discoverable)</option>
        </select>
        <p className="text-xs text-muted-foreground">
          Controls who can see the track in the catalog. Anonymous playback
          still requires “Public preview” below plus public/unlisted rules.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="featured"
          type="checkbox"
          checked={featured}
          onChange={(e) => setFeatured(e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor="featured" className="font-normal">
          Featured (home / lists prefer this track)
        </Label>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="anonymous_visible"
          type="checkbox"
          checked={anonymousVisible}
          onChange={(e) => setAnonymousVisible(e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor="anonymous_visible" className="font-normal">
          Public preview (signed-out vault + landing when visibility allows)
        </Label>
      </div>
      <p className="text-xs text-muted-foreground">
        Public preview only applies if the track is public/unlisted or appears on
        a public/unlisted album.
      </p>

      <div className="flex items-center gap-2">
        <input
          id="show_in_home_more_tracks"
          type="checkbox"
          checked={showInHomeMore}
          onChange={(e) => setShowInHomeMore(e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor="show_in_home_more_tracks" className="font-normal">
          Show on Home “More tracks” (signed-in grid below featured player)
        </Label>
      </div>
      <p className="text-xs text-muted-foreground">
        Uncheck to hide from that list only; the track can still be featured
        above, linked from albums, or opened by URL.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/admin/tracks">Back to tracks</Link>
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href={`/music/tracks/${encodeURIComponent(slug)}`}>
            View public page
          </Link>
        </Button>
      </div>

      {message ? (
        <p
          className={
            message === 'Saved.'
              ? 'text-sm text-emerald-600 dark:text-emerald-400'
              : 'text-sm text-destructive'
          }
          role="status"
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
