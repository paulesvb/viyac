import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TrackRatingPanel } from '@/components/TrackRatingPanel';
import { VaultPlayer } from '@/components/VaultPlayer';
import { isCatalogTrackId } from '@/lib/catalog-track-id';
import {
  getDashboardTrackBySlug,
  toVaultTrackData,
} from '@/lib/dashboard-tracks';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const track = getDashboardTrackBySlug(slug);
  if (!track) return { title: 'Track' };
  return { title: `${track.title} | Music` };
}

export default async function MusicTrackPage({ params }: PageProps) {
  const { slug } = await params;
  const track = getDashboardTrackBySlug(slug);
  if (!track) notFound();

  const vaultData = toVaultTrackData(track);
  const catalogId = track.catalog_track_id?.trim();

  return (
    <div className="min-w-0 w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto mb-6 max-w-6xl">
        <Link
          href="/dashboard"
          className="inline-block text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Back to dashboard
        </Link>
      </div>
      <div className="w-full min-w-0 space-y-4">
        <VaultPlayer variant="embedded" trackData={vaultData} />
        {isCatalogTrackId(catalogId) ? (
          <div className="mx-auto max-w-6xl border-t border-border/60 pt-4">
            <TrackRatingPanel catalogTrackId={catalogId} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
