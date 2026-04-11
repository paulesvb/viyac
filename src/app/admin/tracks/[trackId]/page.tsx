import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { TrackPublishingForm } from '@/components/admin/TrackPublishingForm';
import { isPlatformAdmin } from '@/lib/admin-access';
import { fetchTrackPublishingForAdmin } from '@/lib/admin-catalog';
import { isCatalogTrackId } from '@/lib/catalog-track-id';
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

  const track = await fetchTrackPublishingForAdmin(trackId);
  if (!track) {
    notFound();
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
        trackId={track.id}
        slug={track.slug}
        initial={{
          visibility: track.visibility,
          featured: Boolean(track.featured),
          anonymous_visible: Boolean(track.anonymous_visible),
          show_in_home_more_tracks: track.show_in_home_more_tracks !== false,
        }}
      />
    </div>
  );
}
