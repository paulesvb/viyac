import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AlbumTrackOrderForm } from '@/components/admin/AlbumTrackOrderForm';
import { isPlatformAdmin } from '@/lib/admin-access';
import { fetchAlbumWithTracksForAdmin } from '@/lib/admin-catalog';
import { isCatalogAlbumId } from '@/lib/catalog-track-id';
import { Button } from '@/components/ui/button';

type PageProps = {
  params: Promise<{ albumId: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { albumId } = await params;
  if (!isCatalogAlbumId(albumId)) {
    return { title: 'Album | Admin | Viyac' };
  }
  const album = await fetchAlbumWithTracksForAdmin(albumId);
  return {
    title: album
      ? `Track order — ${album.title} | Admin | Viyac`
      : 'Album | Admin | Viyac',
  };
}

export default async function AdminAlbumTrackOrderPage({ params }: PageProps) {
  const { albumId } = await params;
  if (!isCatalogAlbumId(albumId)) {
    notFound();
  }

  const { userId } = await auth();
  if (!userId) {
    return null;
  }
  if (!isPlatformAdmin(userId)) {
    redirect('/home');
  }

  const album = await fetchAlbumWithTracksForAdmin(albumId);
  if (!album) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="mb-2 -ml-2" asChild>
          <Link href="/admin/albums">← All albums</Link>
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{album.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              <code className="text-xs">{album.slug}</code>
              <span className="mx-2">·</span>
              {album.visibility}
              <span className="mx-2">·</span>
              {album.tracks.length} track{album.tracks.length === 1 ? '' : 's'}
            </p>
          </div>
          <Button size="sm" variant="secondary" asChild>
            <Link
              href={`/music/collections/${encodeURIComponent(album.slug)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View collection
            </Link>
          </Button>
        </div>
      </div>

      <AlbumTrackOrderForm albumId={album.id} initialTracks={album.tracks} />
    </div>
  );
}
