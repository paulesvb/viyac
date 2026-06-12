import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { deleteTrackViewerHide } from '@/actions/shared-tracks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isPlatformAdmin } from '@/lib/admin-access';
import { fetchTrackViewerHidesForAdmin } from '@/lib/admin-catalog';

export const metadata = {
  title: 'Admin — Shared Hides | Viyac',
};

export default async function AdminSharedHidesPage() {
  const { userId } = await auth();
  if (!userId) return null;
  if (!isPlatformAdmin(userId)) redirect('/home');

  const hides = await fetchTrackViewerHidesForAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Shared hides</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Remove hide rows to unhide tracks for specific users.
        </p>
      </div>

      {hides.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No hidden shared tracks</CardTitle>
          </CardHeader>
        </Card>
      ) : (
        <ul className="space-y-2">
          {hides.map((row) => (
            <li key={`${row.track_id}:${row.viewer_user_id}`}>
              <Card>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">{row.track_title}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      <code className="text-xs">{row.track_slug}</code>
                      <span className="mx-2">·</span>
                      hidden by <span className="font-medium">{row.viewer_label}</span>
                      <span className="mx-2">·</span>
                      <time dateTime={row.hidden_at}>
                        {new Date(row.hidden_at).toLocaleString()}
                      </time>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <Link
                        href={`/music/tracks/${encodeURIComponent(row.track_slug)}`}
                        className="underline-offset-4 hover:underline"
                      >
                        Open track
                      </Link>
                    </p>
                  </div>
                  <form
                    action={async () => {
                      'use server';
                      await deleteTrackViewerHide(row.track_id, row.viewer_user_id);
                    }}
                  >
                    <Button type="submit" size="sm" variant="secondary">
                      Delete hide
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
