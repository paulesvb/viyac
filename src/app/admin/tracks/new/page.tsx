import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CreateTrackForm } from '@/components/admin/CreateTrackForm';
import { isPlatformAdmin } from '@/lib/admin-access';
import {
  fetchAllAlbumsForAdmin,
  fetchGenesisOriginalsForCoverPicker,
} from '@/lib/admin-catalog';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'New track | Admin | Viyac',
};

export default async function AdminNewTrackPage() {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }
  if (!isPlatformAdmin(userId)) {
    redirect('/home');
  }

  const [albums, genesisOriginals] = await Promise.all([
    fetchAllAlbumsForAdmin(),
    fetchGenesisOriginalsForCoverPicker(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="mb-2 -ml-2" asChild>
          <Link href="/admin/tracks">← All tracks</Link>
        </Button>
        <h2 className="text-lg font-semibold tracking-tight">New track</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Creates a row in <code className="text-xs">api.tracks</code> owned by
          your Clerk user. You need a <code className="text-xs">profiles</code>{' '}
          row first. Leave as a single or attach to an existing album (adds an{' '}
          <code className="text-xs">api.album_tracks</code> row). After create,
          use publishing for featured and preview. Covers may reference a
          Genesis original only (see below).
        </p>
      </div>
      <CreateTrackForm albums={albums} genesisOriginals={genesisOriginals} />
    </div>
  );
}
