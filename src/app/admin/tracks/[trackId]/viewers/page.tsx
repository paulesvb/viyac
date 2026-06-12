import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { TrackViewerGrantsForm } from '@/components/admin/TrackViewerGrantsForm';
import { isPlatformAdmin } from '@/lib/admin-access';
import { fetchTrackPublishingForAdmin } from '@/lib/admin-catalog';
import { listProfilesForAdminPicker } from '@/lib/profiles-admin-picker';
import { isCatalogTrackId } from '@/lib/catalog-track-id';
import { fetchViewerUserIdsForTrack } from '@/lib/track-viewer-grants';
import { Button } from '@/components/ui/button';

type PageProps = {
  params: Promise<{ trackId: string }>;
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata() {
  return { title: 'Track viewers | Admin | Viyac' };
}

export default async function AdminTrackViewersPage({
  params,
  searchParams,
}: PageProps) {
  const { trackId } = await params;
  const { q } = await searchParams;

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

  const track = await fetchTrackPublishingForAdmin(trackId);
  if (!track) {
    notFound();
  }

  const [grantedIds, users] = await Promise.all([
    fetchViewerUserIdsForTrack(trackId),
    listProfilesForAdminPicker(q ?? null, 200),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="mb-2 -ml-2" asChild>
          <Link href={`/admin/tracks/${trackId}`}>← Publishing</Link>
        </Button>
        <h2 className="text-lg font-semibold tracking-tight">
          Who can see this track
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {track.title}{' '}
          <code className="text-xs text-muted-foreground">({track.slug})</code>
        </p>
      </div>

      <TrackViewerGrantsForm
        trackId={track.id}
        ownerId={track.owner_id?.trim() || null}
        users={users}
        initialGrantedIds={grantedIds}
        searchQuery={q?.trim() ?? ''}
      />
    </div>
  );
}
