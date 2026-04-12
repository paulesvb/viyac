import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CreateAlbumForm } from '@/components/admin/CreateAlbumForm';
import { isPlatformAdmin } from '@/lib/admin-access';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'New album | Admin | Viyac',
};

export default async function AdminNewAlbumPage() {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }
  if (!isPlatformAdmin(userId)) {
    redirect('/home');
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="mb-2 -ml-2" asChild>
          <Link href="/admin/albums">← All albums</Link>
        </Button>
        <h2 className="text-lg font-semibold tracking-tight">New album</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Creates <code className="text-xs">api.albums</code> owned by you. Add
          tracks to the album from Supabase or a future &quot;edit album&quot;
          UI (link tracks in <code className="text-xs">api.album_tracks</code>).
        </p>
      </div>
      <CreateAlbumForm />
    </div>
  );
}
