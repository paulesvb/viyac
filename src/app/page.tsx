import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

/**
 * Public root: no vault playback without sign-in (vault API is session-only).
 * Signed-in users go straight to the app home.
 */
export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect('/home');

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-black">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          VIYAC
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Sign in to listen in the vault. A public preview page may come later.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login?redirect_url=%2Fhome"
            className="rounded-full border border-cyan-500/50 bg-cyan-500/10 px-5 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20"
          >
            Sign in
          </Link>
          <Link
            href="/signup?redirect_url=%2Fhome"
            className="rounded-full border border-border px-5 py-2 text-sm font-medium text-muted-foreground transition hover:border-foreground/30 hover:text-foreground"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
