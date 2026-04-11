'use client';

import Link from 'next/link';
import { useAuth, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';

type NavbarProps = {
  /** Only platform admins see Admin (see `ADMIN_CLERK_USER_ID` in env). */
  showAdminLink?: boolean;
};

export function Navbar({ showAdminLink = false }: NavbarProps) {
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <nav className="relative z-50 border-b bg-background">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="Viyac logo"
            width={32}
            height={32}
            className="h-8 w-8 shrink-0"
            decoding="async"
          />
          <span>Viyac</span>
        </Link>

        <div className="flex min-h-8 items-center gap-4">
          {!isLoaded ? (
            <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
          ) : isSignedIn ? (
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/home">Home</Link>
              </Button>
              {showAdminLink ? (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/tracks">Admin</Link>
                </Button>
              ) : null}
              <UserButton />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Sign up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
