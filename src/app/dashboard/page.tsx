'use client';

import { useUser } from '@clerk/nextjs';
import { VaultPlayer } from '@/components/VaultPlayer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getPublicAssetUrl } from '@/lib/storage';

function dashboardPlayerBgUrl(): string {
  const path = process.env.NEXT_PUBLIC_DASHBOARD_VAULT_BG_PATH?.trim();
  if (!path) return 'https://picsum.photos/seed/viyac-dashboard/1920/1080';
  try {
    return getPublicAssetUrl(path);
  } catch {
    return 'https://picsum.photos/seed/viyac-dashboard/1920/1080';
  }
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const trackPath = process.env.NEXT_PUBLIC_DASHBOARD_VAULT_TRACK_PATH?.trim();

  if (!isLoaded) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Dashboard</h1>

      <div className="mb-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
              <p className="text-sm">
                <span className="text-muted-foreground">User ID:</span>{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  {user?.id}
                </code>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Next steps for your app</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>Add more protected routes</li>
              <li>Connect a database for data</li>
              <li>Customize the UI</li>
              <li>Deploy to Vercel</li>
            </ul>
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

      <section className="space-y-4" aria-labelledby="vault-player-heading">
        <h2 id="vault-player-heading" className="text-xl font-semibold tracking-tight">
          Vault player
        </h2>

        {trackPath ? (
          <VaultPlayer
            variant="embedded"
            trackData={{
              bg_image_url: dashboardPlayerBgUrl(),
              content_type: 'video',
              track_path: trackPath,
              title: 'Preview',
              description_en: 'Signed-in playback from the vault bucket.',
            }}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">No track configured</CardTitle>
              <CardDescription>
                Add a vault path so the player can request a signed URL.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Example in <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code>:
              </p>
              <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs text-foreground">
                {`NEXT_PUBLIC_DASHBOARD_VAULT_TRACK_PATH=your-folder/master.m3u8
# Optional — public assets bucket path for the blurred background
# NEXT_PUBLIC_DASHBOARD_VAULT_BG_PATH=backgrounds/dashboard.jpg`}
              </pre>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
