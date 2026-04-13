'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import Link from 'next/link';
import { updateTrackPublishingFields } from '@/actions/admin-catalog';
import type { TrackPublishingInput } from '@/actions/admin-catalog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type {
  AdminAlbumSummary,
  GenesisOriginalOption,
} from '@/lib/admin-catalog';
import type { CatalogTrackRow } from '@/lib/catalog-types';
import { cn } from '@/lib/utils';

const lyricsTextareaClass = cn(
  'placeholder:text-muted-foreground w-full min-h-[120px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow]',
  'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
);

type Props = {
  trackId: string;
  slug: string;
  initial: TrackPublishingInput;
  genesisOriginals: GenesisOriginalOption[];
  albums: AdminAlbumSummary[];
};

export function TrackPublishingForm({
  trackId,
  slug,
  initial,
  genesisOriginals,
  albums,
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
  const [lyrics, setLyrics] = useState(initial.lyrics ?? '');
  const [lyricsBy, setLyricsBy] = useState(initial.lyrics_by ?? '');
  const [albumAssignment, setAlbumAssignment] = useState<
    'single' | 'album'
  >(initial.album_assignment);
  const [albumId, setAlbumId] = useState(initial.album_id?.trim() ?? '');
  const [instruments, setInstruments] = useState(initial.instruments ?? '');
  const [isInstrumental, setIsInstrumental] = useState(
    Boolean(initial.is_instrumental),
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
      if (albumAssignment === 'album' && !albumId.trim()) {
        setMessage('Choose an album, or select Single (not on an album).');
        return;
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
          lyrics,
          lyrics_by: lyricsBy,
          album_assignment: albumAssignment,
          album_id: albumId,
          instruments,
          is_instrumental: isInstrumental,
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
      lyrics,
      lyricsBy,
      albumAssignment,
      albumId,
      instruments,
      isInstrumental,
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

      <fieldset className="space-y-3 rounded-lg border border-border/60 p-4">
        <legend className="px-1 text-sm font-medium text-foreground">
          Album placement
        </legend>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name="edit_album_assignment"
            checked={albumAssignment === 'single'}
            onChange={() => {
              setAlbumAssignment('single');
              setAlbumId('');
            }}
            className="h-4 w-4 border-input"
          />
          <span className="text-sm">Single (not on an album)</span>
        </label>
        <label
          className={cn(
            'flex items-center gap-2',
            albums.length === 0 ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          )}
        >
          <input
            type="radio"
            name="edit_album_assignment"
            checked={albumAssignment === 'album'}
            disabled={albums.length === 0}
            onChange={() => setAlbumAssignment('album')}
            className="h-4 w-4 border-input"
          />
          <span className="text-sm">On an album</span>
        </label>
        {albumAssignment === 'album' ? (
          <div className="space-y-2 pt-1">
            <Label htmlFor="edit_album_id">Album</Label>
            <select
              id="edit_album_id"
              value={albumId}
              onChange={(e) => setAlbumId(e.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">— Choose album —</option>
              {albums.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} ({a.slug})
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {albums.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No albums yet. Create one under{' '}
            <span className="text-foreground/90">Admin → Albums</span>, or keep
            this track as a single.
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Changing album removes this track from the previous album’s track list
          and appends it to the end of the new one (order is not preserved here).
        </p>
      </fieldset>

      <div className="flex items-center gap-2">
        <input
          id="edit_is_instrumental"
          type="checkbox"
          checked={isInstrumental}
          onChange={(e) => setIsInstrumental(e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor="edit_is_instrumental" className="font-normal">
          Instrumental (no lead vocal)
        </Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit_instruments">Instruments (optional)</Label>
        <Input
          id="edit_instruments"
          value={instruments}
          onChange={(e) => setInstruments(e.target.value)}
          placeholder="piano, guitar"
        />
        <p className="text-xs text-muted-foreground">
          Comma-separated; stored as normalized tags (same as new track form).
        </p>
      </div>

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

      <section className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Lyrics (optional)</h3>
        <div className="space-y-2">
          <Label htmlFor="edit_lyrics">Lyrics</Label>
          <textarea
            id="edit_lyrics"
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            className={lyricsTextareaClass}
            rows={14}
            placeholder={'[VERSE]\nLine one…\n\n[CHORUS]\nHook line…'}
          />
          <p className="text-xs text-muted-foreground">
            Section headers on their own line:{' '}
            <code className="text-[11px]">[VERSE]</code>,{' '}
            <code className="text-[11px]">[CHORUS]</code>. Leave empty to clear
            stored lyrics.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit_lyrics_by">Lyrics by (optional)</Label>
          <Input
            id="edit_lyrics_by"
            value={lyricsBy}
            onChange={(e) => setLyricsBy(e.target.value)}
            placeholder="Writer or credit line"
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
