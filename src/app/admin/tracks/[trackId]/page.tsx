import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { TrackPublishingForm } from '@/components/admin/TrackPublishingForm';
import { isPlatformAdmin } from '@/lib/admin-access';
import {
  fetchAllAlbumsForAdmin,
  fetchGenesisOriginalsForCoverPicker,
  fetchTrackAlbumPlacementForAdmin,
  fetchTrackIdSlugTitleForAdmin,
  fetchTrackPublishingForAdmin,
} from '@/lib/admin-catalog';
import { isCatalogTrackId } from '@/lib/catalog-track-id';
import { formatTagLabel, normalizeTagList } from '@/lib/track-meta';
import { Button } from '@/components/ui/button';

type PageProps = {
  params: Promise<{ trackId: string }>;
};

export async function generateMetadata() {
  return { title: 'Edit track | Admin | Viyac' };
}

export default async function AdminTrackEditPage({ params }: PageProps) {
  const { trackId } = await params;
  if (!isCatalogTrackId(trackId)) {
    notFound();
  }

  const { userId } = await auth();
  if (!userId) {
    return null;
  }
  if (!isPlatformAdmin(userId)) {
    redirect('/home');
  }

  const [track, genesisOriginals, albums, albumPlacement] = await Promise.all([
    fetchTrackPublishingForAdmin(trackId),
    fetchGenesisOriginalsForCoverPicker(trackId),
    fetchAllAlbumsForAdmin(),
    fetchTrackAlbumPlacementForAdmin(trackId),
  ]);
  if (!track) {
    notFound();
  }

  let genesisOriginalsForForm = genesisOriginals;
  const currentOriginalId = track.original_track_id;
  if (
    currentOriginalId &&
    !genesisOriginalsForForm.some((o) => o.id === currentOriginalId)
  ) {
    const extra = await fetchTrackIdSlugTitleForAdmin(currentOriginalId);
    if (extra) {
      genesisOriginalsForForm = [...genesisOriginalsForForm, extra].sort(
        (a, b) => a.title.localeCompare(b.title),
      );
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="mb-2 -ml-2" asChild>
          <Link href="/admin/tracks">← All tracks</Link>
        </Button>
        <h2 className="text-lg font-semibold tracking-tight">{track.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          <code className="text-xs">{track.slug}</code>
        </p>
      </div>

      <TrackPublishingForm
        key={track.updated_at}
        trackId={track.id}
        slug={track.slug}
        albums={albums}
        genesisOriginals={genesisOriginalsForForm}
        initial={{
          visibility: track.visibility,
          featured: Boolean(track.featured),
          anonymous_visible: Boolean(track.anonymous_visible),
          show_in_home_more_tracks: track.show_in_home_more_tracks !== false,
          is_cover: Boolean(track.is_cover),
          original_track_id: track.original_track_id ?? '',
          vault_background_video_path:
            track.vault_background_video_path ?? '',
          thumbnail_path: track.thumbnail_path ?? '',
          lock_screen_art_path: track.lock_screen_art_path ?? '',
          lyrics: track.lyrics ?? '',
          lyrics_by: track.lyrics_by ?? '',
          album_assignment: albumPlacement.album_assignment,
          album_id: albumPlacement.album_id,
          instruments: normalizeTagList(track.instruments)
            .map(formatTagLabel)
            .join(', '),
          is_instrumental: Boolean(track.is_instrumental),
        }}
      />

      <div className="border-t border-border pt-6">
        <h3 className="text-sm font-medium text-foreground">Private access</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Grant specific signed-in users access when the track is not public.
        </p>
        <Button variant="outline" size="sm" className="mt-3" asChild>
          <Link href={`/admin/tracks/${track.id}/viewers`}>
            Curate viewers…
          </Link>
        </Button>
      </div>
    </div>
  );
}
