'use client';

import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { DashboardFeaturedMarquee } from '@/components/DashboardFeaturedMarquee';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getDashboardTracks,
  getFeaturedDashboardTrack,
  getOtherDashboardTracks,
} from '@/lib/dashboard-tracks';

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const tracks = getDashboardTracks();
  const featured = getFeaturedDashboardTrack();
  const otherTracks = getOtherDashboardTracks();
  const showTrackListOrEmpty =
    tracks.length === 0 || otherTracks.length > 0;

  if (!isLoaded) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-w-0 w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mx-auto mb-6 max-w-6xl sm:mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Dashboard
        </h1>
      </header>

      {featured ? (
        <div className="mb-8 w-full min-w-0 sm:mb-10">
          <DashboardFeaturedMarquee track={featured} />
        </div>
      ) : null}

      {showTrackListOrEmpty ? (
      <div className="mx-auto max-w-6xl space-y-10">
      {tracks.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No tracks configured</CardTitle>
            <CardDescription>
              Add entries in{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                src/config/dashboard-tracks.ts
              </code>{' '}
              or set a vault path for a single preview track.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Example in{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                .env.local
              </code>
              :
            </p>
            <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs text-foreground">
              {`NEXT_PUBLIC_DASHBOARD_VAULT_TRACK_PATH=your-folder/master.m3u8
# Optional — public assets bucket path for the blurred background
# NEXT_PUBLIC_DASHBOARD_VAULT_BG_PATH=backgrounds/dashboard.jpg`}
            </pre>
          </CardContent>
        </Card>
      ) : null}

      {otherTracks.length > 0 ? (
        <section className="space-y-4" aria-labelledby="more-tracks-heading">
          <h2
            id="more-tracks-heading"
            className="text-xl font-semibold tracking-tight"
          >
            More tracks
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {otherTracks.map((track) => (
              <li key={track.slug}>
                <Link
                  href={`/music/tracks/${encodeURIComponent(track.slug)}`}
                  className="block rounded-lg border border-border bg-card p-4 transition hover:border-cyan-500/40 hover:bg-muted/40"
                >
                  <p className="font-medium text-foreground">{track.title}</p>
                  {track.description_en ? (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {track.description_en}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Open player →
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      </div>
      ) : null}

      <div className="mx-auto mt-10 max-w-6xl grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Welcome!</CardTitle>
            <CardDescription>You are signed in</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="text-muted-foreground">Email:</span>{' '}
                {user?.primaryEmailAddress?.emailAddress}
              </p>
              {user?.fullName && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Name:</span>{' '}
                  {user.fullName}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Protected Content</CardTitle>
            <CardDescription>Only visible when authenticated</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This page is protected by Clerk middleware. Unauthenticated users
              are redirected to sign in.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
