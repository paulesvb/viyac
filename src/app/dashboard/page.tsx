'use client';

import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Welcome!</CardTitle>
            <CardDescription>You are signed in</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="text-muted-foreground">Email:</span>{' '}
                {user?.email}
              </p>
              {user?.displayName && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Name:</span>{' '}
                  {user.displayName}
                </p>
              )}
              <p className="text-sm">
                <span className="text-muted-foreground">User ID:</span>{' '}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  {user?.uid}
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
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Add more protected routes</li>
              <li>Connect to Firestore for data</li>
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
              This page is protected by middleware. Unauthenticated users 
              are redirected to the login page.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
