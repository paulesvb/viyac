import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { fetchAllAlbumsForAdmin } from '@/lib/admin-catalog';
import { isPlatformAdmin } from '@/lib/admin-access';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const metadata = {
  title: 'Admin — Albums | Viyac',
};

export default async function AdminAlbumsPage() {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }
  if (!isPlatformAdmin(userId)) {
    redirect('/home');
  }

  const albums = await fetchAllAlbumsForAdmin();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Albums</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Catalog albums. Track order and membership are{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              api.album_tracks
            </code>
            .
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/albums/new">New album</Link>
        </Button>
      </div>

      {albums.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No albums</CardTitle>
            <CardDescription>
              Create one with <strong>New album</strong> or insert in Supabase.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="space-y-2">
          {albums.map((a) => (
            <li key={a.id}>
              <Card>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">{a.title}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      <code className="text-xs">{a.slug}</code>
                      <span className="mx-2">·</span>
                      {a.visibility}
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" asChild>
                    <Link
                      href={`/music/albums/${encodeURIComponent(a.slug)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
