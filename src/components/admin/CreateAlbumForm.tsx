'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import Link from 'next/link';
import { createCatalogAlbum } from '@/actions/admin-catalog-create';
import type { CreateAlbumInput } from '@/actions/admin-catalog-create';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CatalogAlbumRow } from '@/lib/catalog-types';

const visibilities: CatalogAlbumRow['visibility'][] = [
  'private',
  'unlisted',
  'public',
];

export function CreateAlbumForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [visibility, setVisibility] =
    useState<CatalogAlbumRow['visibility']>('private');
  const [coverPath, setCoverPath] = useState('');

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setMessage(null);
      const payload: CreateAlbumInput = {
        title,
        slug,
        visibility,
        cover_image_path: coverPath,
      };
      startTransition(async () => {
        const result = await createCatalogAlbum(payload);
        if (result.ok) {
          router.push('/admin/albums');
        } else {
          setMessage(result.error);
        }
      });
    },
    [title, slug, visibility, coverPath, router],
  );

  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-5">
      <div className="space-y-2">
        <Label htmlFor="album-title">Title</Label>
        <Input
          id="album-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Album title"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="album-slug">Slug (optional)</Label>
        <Input
          id="album-slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="Global URL slug; generated from title if empty"
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Must be unique across all albums. A numeric suffix is added if taken.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="album-visibility">Visibility</Label>
        <select
          id="album-visibility"
          value={visibility}
          onChange={(e) =>
            setVisibility(e.target.value as CatalogAlbumRow['visibility'])
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
        <Label htmlFor="cover_path">Cover image path (optional)</Label>
        <Input
          id="cover_path"
          value={coverPath}
          onChange={(e) => setCoverPath(e.target.value)}
          placeholder="public assets bucket key, e.g. covers/my-album.jpg"
          className="font-mono text-sm"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create album'}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/admin/albums">Cancel</Link>
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
