'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import Link from 'next/link';
import { updateTrackPublishingFields } from '@/actions/admin-catalog';
import type { TrackPublishingInput } from '@/actions/admin-catalog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { GenesisOriginalOption } from '@/lib/admin-catalog';
import type { CatalogTrackRow } from '@/lib/catalog-types';

type Props = {
  trackId: string;
  slug: string;
  initial: TrackPublishingInput;
  genesisOriginals: GenesisOriginalOption[];
};

export function TrackPublishingForm({
  trackId,
  slug,
  initial,
  genesisOriginals,
}: Props) {
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
  const [isCover, setIsCover] = useState(Boolean(initial.is_cover));
  const [originalTrackId, setOriginalTrackId] = useState(
    initial.original_track_id?.trim() ?? '',
  );
  const [vaultBackgroundVideoPath, setVaultBackgroundVideoPath] = useState(
    initial.vault_background_video_path?.trim() ?? '',
  );
  const [thumbnailPath, setThumbnailPath] = useState(
    initial.thumbnail_path?.trim() ?? '',
  );
  const [lockScreenArtPath, setLockScreenArtPath] = useState(
    initial.lock_screen_art_path?.trim() ?? '',
  );

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setMessage(null);
      if (isCover) {
        if (genesisOriginals.length === 0) {
          setMessage(
            'No Genesis originals in the catalog. Create a GENESIS track first, or uncheck cover.',
          );
          return;
        }
        if (!originalTrackId.trim()) {
          setMessage('Choose the Genesis original this cover is based on.');
          return;
        }
      }
      startTransition(async () => {
        const result = await updateTrackPublishingFields(trackId, slug, {
          visibility,
          featured,
          anonymous_visible: anonymousVisible,
          show_in_home_more_tracks: showInHomeMore,
          is_cover: isCover,
          original_track_id: originalTrackId,
          vault_background_video_path: vaultBackgroundVideoPath,
          thumbnail_path: thumbnailPath,
          lock_screen_art_path: lockScreenArtPath,
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
      isCover,
      originalTrackId,
      vaultBackgroundVideoPath,
      thumbnailPath,
      lockScreenArtPath,
      genesisOriginals.length,
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

      <fieldset className="space-y-3 rounded-lg border border-border/60 p-4">
        <legend className="px-1 text-sm font-medium text-foreground">
          Cover version
        </legend>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={isCover}
            onChange={(e) => {
              const on = e.target.checked;
              setIsCover(on);
              if (!on) setOriginalTrackId('');
            }}
            className="h-4 w-4 rounded border-input"
          />
          <span className="text-sm">
            This track is a cover of a Genesis (GENESIS) original
          </span>
        </label>
        {isCover ? (
          <div className="space-y-2 pt-1">
            <Label htmlFor="edit_original_track_id">Genesis original</Label>
            <select
              id="edit_original_track_id"
              value={originalTrackId}
              onChange={(e) => setOriginalTrackId(e.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">— Choose original —</option>
              {genesisOriginals.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.slug})
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Only Genesis tracks that are not themselves covers appear here
              (any owner). This track is excluded from the list. A Genesis
              original cannot be deleted while covers still reference it.
            </p>
            {genesisOriginals.length === 0 ? (
              <p className="text-xs text-amber-600/90 dark:text-amber-400/90">
                No eligible originals yet — set provenance to GENESIS on at
                least one other track, or turn off cover for this row.
              </p>
            ) : null}
          </div>
        ) : null}
      </fieldset>

      <section className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Vault &amp; art paths</h3>
        <p className="text-xs text-muted-foreground">
          Object keys in private vault or public assets buckets unless noted.
          Leave empty to clear.
        </p>
        <div className="space-y-2">
          <Label htmlFor="edit_vault_background_video_path">
            Vault background video (optional)
          </Label>
          <Input
            id="edit_vault_background_video_path"
            value={vaultBackgroundVideoPath}
            onChange={(e) => setVaultBackgroundVideoPath(e.target.value)}
            placeholder="folder/loop.mp4"
            className="font-mono text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit_thumbnail_path">Thumbnail path (optional)</Label>
          <Input
            id="edit_thumbnail_path"
            value={thumbnailPath}
            onChange={(e) => setThumbnailPath(e.target.value)}
            placeholder="covers/track.jpg"
            className="font-mono text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit_lock_screen_art_path">
            Lock screen art path (optional)
          </Label>
          <Input
            id="edit_lock_screen_art_path"
            value={lockScreenArtPath}
            onChange={(e) => setLockScreenArtPath(e.target.value)}
            placeholder="covers/track-lock.jpg"
            className="font-mono text-sm"
          />
        </div>
      </section>

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
