import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { fetchAllTracksForAdmin } from '@/lib/admin-catalog';
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
  title: 'Admin — Tracks | Viyac',
};

function flagLabel(on: boolean): string {
  return on ? 'Yes' : 'No';
}

export default async function AdminTracksPage() {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }
  if (!isPlatformAdmin(userId)) {
    redirect('/home');
  }

  const tracks = await fetchAllTracksForAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Tracks</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit visibility, featured, and public preview for any catalog track.
        </p>
      </div>

      {tracks.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No tracks</CardTitle>
            <CardDescription>
              Seed the catalog (e.g.{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                npm run seed:catalog
              </code>
              ) or add rows in Supabase under{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                api.tracks
              </code>
              .
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="space-y-2">
          {tracks.map((t) => (
            <li key={t.id}>
              <Card>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">{t.title}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      <code className="text-xs">{t.slug}</code>
                      <span className="mx-2">·</span>
                      {t.visibility}
                      <span className="mx-2">·</span>
                      featured {flagLabel(t.featured)}
                      <span className="mx-2">·</span>
                      preview {flagLabel(t.anonymous_visible)}
                      <span className="mx-2">·</span>
                      home more {flagLabel(t.show_in_home_more_tracks !== false)}
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" asChild>
                    <Link href={`/admin/tracks/${t.id}`}>Edit</Link>
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
