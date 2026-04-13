'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import Link from 'next/link';
import { createCatalogTrack } from '@/actions/admin-catalog-create';
import type { CreateTrackInput } from '@/actions/admin-catalog-create';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type {
  AdminAlbumSummary,
  GenesisOriginalOption,
} from '@/lib/admin-catalog';
import {
  MASTERING_PROVENANCE_VALUES,
  type CatalogTrackRow,
} from '@/lib/catalog-types';
import { PROVENANCE_META } from '@/lib/provenance';

const visibilities: CatalogTrackRow['visibility'][] = [
  'private',
  'unlisted',
  'public',
];

const textareaClass = cn(
  'placeholder:text-muted-foreground w-full min-h-[88px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow]',
  'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
  'disabled:cursor-not-allowed disabled:opacity-50',
);

type Props = {
  albums: AdminAlbumSummary[];
  genesisOriginals: GenesisOriginalOption[];
};

export function CreateTrackForm({ albums, genesisOriginals }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [trackPath, setTrackPath] = useState('');
  const [contentType, setContentType] =
    useState<CatalogTrackRow['content_type']>('audio');
  const [visibility, setVisibility] =
    useState<CatalogTrackRow['visibility']>('private');
  const [provenance, setProvenance] = useState<string>('');
  const [composer, setComposer] = useState('');
  const [durationSeconds, setDurationSeconds] = useState('');
  const [waveformJsonVaultPath, setWaveformJsonVaultPath] = useState('');
  const [vaultBackgroundVideoPath, setVaultBackgroundVideoPath] = useState('');
  const [thumbnailPath, setThumbnailPath] = useState('');
  const [lockScreenArtPath, setLockScreenArtPath] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionEs, setDescriptionEs] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [lyricsBy, setLyricsBy] = useState('');
  const [genres, setGenres] = useState('');
  const [instruments, setInstruments] = useState('');
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [releaseDate, setReleaseDate] = useState('');
  const [albumAssignment, setAlbumAssignment] = useState<'single' | 'album'>(
    'single',
  );
  const [albumId, setAlbumId] = useState('');
  const [masteringProvenance, setMasteringProvenance] = useState('');
  const [isCover, setIsCover] = useState(false);
  const [originalTrackId, setOriginalTrackId] = useState('');

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setMessage(null);
      if (albumAssignment === 'album' && !albumId.trim()) {
        setMessage('Choose an album, or select Single.');
        return;
      }
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
      const payload: CreateTrackInput = {
        title,
        slug,
        track_path: trackPath,
        content_type: contentType,
        visibility,
        provenance_type: (provenance || '') as CreateTrackInput['provenance_type'],
        composer,
        duration_seconds: durationSeconds,
        waveform_json_vault_path: waveformJsonVaultPath,
        vault_background_video_path: vaultBackgroundVideoPath,
        thumbnail_path: thumbnailPath,
        lock_screen_art_path: lockScreenArtPath,
        description_en: descriptionEn,
        description_es: descriptionEs,
        lyrics,
        lyrics_by: lyricsBy,
        genres,
        instruments,
        is_instrumental: isInstrumental,
        release_date: releaseDate,
        album_assignment: albumAssignment,
        album_id: albumId,
        mastering_provenance: masteringProvenance,
        is_cover: isCover,
        original_track_id: originalTrackId,
      };
      startTransition(async () => {
        const result = await createCatalogTrack(payload);
        if (result.ok) {
          router.push(`/admin/tracks/${result.trackId}`);
        } else {
          setMessage(result.error);
        }
      });
    },
    [
      title,
      slug,
      trackPath,
      contentType,
      visibility,
      provenance,
      composer,
      durationSeconds,
      waveformJsonVaultPath,
      vaultBackgroundVideoPath,
      thumbnailPath,
      lockScreenArtPath,
      descriptionEn,
      descriptionEs,
      lyrics,
      lyricsBy,
      genres,
      instruments,
      isInstrumental,
      releaseDate,
      albumAssignment,
      albumId,
      masteringProvenance,
      isCover,
      originalTrackId,
      genesisOriginals.length,
      router,
    ],
  );

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-8">
      <section className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Core</h3>
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Track title"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug (optional)</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="URL segment; generated from title if empty"
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Unique per your user. A numeric suffix is added if the slug is taken.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="track_path">Vault track path</Label>
          <Input
            id="track_path"
            value={trackPath}
            onChange={(e) => setTrackPath(e.target.value)}
            required
            placeholder="folder/master.m3u8"
            className="font-mono text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="content_type">Media type</Label>
          <select
            id="content_type"
            value={contentType}
            onChange={(e) =>
              setContentType(e.target.value as CatalogTrackRow['content_type'])
            }
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="audio">Audio</option>
            <option value="video">Video</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="visibility">Visibility</Label>
          <select
            id="visibility"
            value={visibility}
            onChange={(e) =>
              setVisibility(e.target.value as CatalogTrackRow['visibility'])
            }
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {visibilities.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="provenance">Provenance (optional)</Label>
          <select
            id="provenance"
            value={provenance}
            onChange={(e) => setProvenance(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">—</option>
            {(Object.keys(PROVENANCE_META) as Array<keyof typeof PROVENANCE_META>).map(
              (k) => (
                <option key={k} value={k}>
                  {PROVENANCE_META[k].label}
                </option>
              ),
            )}
          </select>
          <p className="text-xs text-muted-foreground">
            Stored as{' '}
            <code className="text-[11px]">genesis</code>,{' '}
            <code className="text-[11px]">hybrid</code>, or{' '}
            <code className="text-[11px]">echo</code> — not uppercase labels.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="mastering_provenance">Mastering provenance (optional)</Label>
          <select
            id="mastering_provenance"
            value={masteringProvenance}
            onChange={(e) => setMasteringProvenance(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Unset</option>
            {MASTERING_PROVENANCE_VALUES.map((v) => (
              <option key={v} value={v}>
                {v === 'STUDIO MASTERED' ? 'Studio mastered' : 'AI mastered'}
              </option>
            ))}
          </select>
        </div>

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
              <Label htmlFor="original_track_id">Genesis original</Label>
              <select
                id="original_track_id"
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
                (any owner). A Genesis original cannot be deleted while covers
                still reference it.
              </p>
              {genesisOriginals.length === 0 ? (
                <p className="text-xs text-amber-600/90 dark:text-amber-400/90">
                  No eligible originals yet — set provenance to GENESIS on at
                  least one track, or leave this as a non-cover track.
                </p>
              ) : null}
            </div>
          ) : null}
        </fieldset>

        <fieldset className="space-y-3 rounded-lg border border-border/60 p-4">
          <legend className="px-1 text-sm font-medium text-foreground">
            Catalog placement
          </legend>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="album_assignment"
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
              name="album_assignment"
              checked={albumAssignment === 'album'}
              disabled={albums.length === 0}
              onChange={() => setAlbumAssignment('album')}
              className="h-4 w-4 border-input"
            />
            <span className="text-sm">Add to existing album</span>
          </label>
          {albumAssignment === 'album' ? (
            <div className="space-y-2 pt-1">
              <Label htmlFor="album_id">Album</Label>
              <select
                id="album_id"
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
              No albums in the catalog yet. Create one under{' '}
              <span className="text-foreground/90">Admin → Albums</span>, or keep
              this track as a single.
            </p>
          ) : null}
        </fieldset>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Credits &amp; meta</h3>
        <div className="space-y-2">
          <Label htmlFor="composer">Composer (optional)</Label>
          <Input
            id="composer"
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
            placeholder="Composer name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration_seconds">Duration (optional, seconds)</Label>
          <Input
            id="duration_seconds"
            type="text"
            inputMode="decimal"
            value={durationSeconds}
            onChange={(e) => setDurationSeconds(e.target.value)}
            placeholder="e.g. 180 for 3 minutes"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="release_date">Release date (optional)</Label>
          <Input
            id="release_date"
            type="date"
            value={releaseDate}
            onChange={(e) => setReleaseDate(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Stored as a date (use 1st of month for month-only releases).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            id="is_instrumental"
            type="checkbox"
            checked={isInstrumental}
            onChange={(e) => setIsInstrumental(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          <Label htmlFor="is_instrumental" className="font-normal">
            Instrumental (no lead vocal)
          </Label>
        </div>
        <div className="space-y-2">
          <Label htmlFor="genres">Genres (optional)</Label>
          <Input
            id="genres"
            value={genres}
            onChange={(e) => setGenres(e.target.value)}
            placeholder="electronic, latin (comma-separated)"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="instruments">Instruments (optional)</Label>
          <Input
            id="instruments"
            value={instruments}
            onChange={(e) => setInstruments(e.target.value)}
            placeholder="piano, guitar"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Vault &amp; art paths</h3>
        <p className="text-xs text-muted-foreground">
          Object keys in private vault or public assets buckets unless noted.
        </p>
        <div className="space-y-2">
          <Label htmlFor="waveform_json_vault_path">
            Waveform JSON (vault, optional)
          </Label>
          <Input
            id="waveform_json_vault_path"
            value={waveformJsonVaultPath}
            onChange={(e) => setWaveformJsonVaultPath(e.target.value)}
            placeholder="folder/waveform.json"
            className="font-mono text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vault_background_video_path">
            Vault background video (optional)
          </Label>
          <Input
            id="vault_background_video_path"
            value={vaultBackgroundVideoPath}
            onChange={(e) => setVaultBackgroundVideoPath(e.target.value)}
            placeholder="folder/loop.mp4"
            className="font-mono text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="thumbnail_path">Thumbnail path (optional)</Label>
          <Input
            id="thumbnail_path"
            value={thumbnailPath}
            onChange={(e) => setThumbnailPath(e.target.value)}
            placeholder="covers/track.jpg"
            className="font-mono text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lock_screen_art_path">
            Lock screen art path (optional)
          </Label>
          <Input
            id="lock_screen_art_path"
            value={lockScreenArtPath}
            onChange={(e) => setLockScreenArtPath(e.target.value)}
            placeholder="covers/track-lock.jpg"
            className="font-mono text-sm"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Descriptions</h3>
        <div className="space-y-2">
          <Label htmlFor="description_en">Description (English, optional)</Label>
          <textarea
            id="description_en"
            value={descriptionEn}
            onChange={(e) => setDescriptionEn(e.target.value)}
            className={textareaClass}
            rows={4}
            placeholder="Short description…"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description_es">Description (Spanish, optional)</Label>
          <textarea
            id="description_es"
            value={descriptionEs}
            onChange={(e) => setDescriptionEs(e.target.value)}
            className={textareaClass}
            rows={4}
            placeholder="Descripción…"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lyrics">Lyrics (optional)</Label>
          <textarea
            id="lyrics"
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            className={textareaClass}
            rows={12}
            placeholder={'[VERSE]\nLine one…\n\n[CHORUS]\nHook line…'}
          />
          <p className="text-xs text-muted-foreground">
            Put section names on their own line in brackets, e.g.{' '}
            <code className="text-[11px]">[VERSE]</code>,{' '}
            <code className="text-[11px]">[CHORUS]</code> (letters, numbers,
            spaces, hyphen). Anything else stays as lyric text.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lyrics_by">Lyrics by (optional)</Label>
          <Input
            id="lyrics_by"
            value={lyricsBy}
            onChange={(e) => setLyricsBy(e.target.value)}
            placeholder="Writer or credit line"
          />
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create track'}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/admin/tracks">Cancel</Link>
        </Button>
      </div>
      {message ? (
        <p className="text-sm text-destructive" role="alert">
          {message}
        </p>
      ) : null}
    </form>
  );
}
