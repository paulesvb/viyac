import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { ensureClerkProfileSynced } from '@/lib/ensure-clerk-profile';

/**
 * Local dev only: Clerk forces redirect here after sign-in/up; we upsert `profiles` with is_dev=true, then go home.
 * Production builds skip work and redirect immediately.
 */
export default async function DevSyncProfilePage() {
  if (process.env.NODE_ENV !== 'development') {
    redirect('/home');
  }

  const { userId } = await auth();
  if (!userId) {
    redirect('/login');
  }

  await ensureClerkProfileSynced({ markDevProfile: true });
  redirect('/home');
}
