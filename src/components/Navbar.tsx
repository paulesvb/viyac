'use client';

import Link from 'next/link';
import { UserButton, useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { clerkUserButtonAppearance } from '@/lib/clerk-auth-appearance';
import { useTranslate } from '@/hooks/use-translate';
import { useAuthHref } from '@/hooks/use-auth-href';
import { useCampaignHref } from '@/hooks/use-campaign-href';

type NavbarProps = {
  /** From server `auth()` — avoids signed-out flicker while Clerk hydrates. */
  serverSignedIn?: boolean;
  showAdminLink?: boolean;
  favoritesCount?: number;
  sharedTracksCount?: number;
};

function SignedOutNav() {
  const t = useTranslate();
  const { loginPath, signupPath } = useAuthHref();

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button variant="ghost" asChild className="shrink-0">
        <Link href={loginPath} prefetch={false}>
          {t('navSignIn')}
        </Link>
      </Button>
      <Button variant="brand" asChild className="shrink-0">
        <Link href={signupPath} prefetch={false}>
          {t('navSignUp')}
        </Link>
      </Button>
    </div>
  );
}

function SignedInNav({
  showAdminLink = false,
  favoritesCount = 0,
  sharedTracksCount = 0,
}: NavbarProps) {
  const t = useTranslate();
  const { homeHref } = useCampaignHref();
  const favoritesBadgeLabel =
    favoritesCount > 99 ? '99+' : String(favoritesCount);
  const sharedBadgeLabel =
    sharedTracksCount > 99 ? '99+' : String(sharedTracksCount);

  return (
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
        <Link href={homeHref}>{t('navHome')}</Link>
      </Button>
      {favoritesCount > 0 ? (
        <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
          <Link href="/tracks/favorites" className="inline-flex items-center gap-1.5">
            <span>{t('navFavorites')}</span>
            <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-amber-500/20 px-1.5 text-[11px] font-semibold leading-none text-amber-100 ring-1 ring-amber-400/40 tabular-nums">
              {favoritesBadgeLabel}
            </span>
          </Link>
        </Button>
      ) : null}
      {sharedTracksCount > 0 ? (
        <Button variant="ghost" size="sm" asChild>
          <Link href="/tracks/shared" className="inline-flex items-center gap-1.5">
            <span>{t('navShared')}</span>
            <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-cyan-500/20 px-1.5 text-[11px] font-semibold leading-none text-cyan-200 ring-1 ring-cyan-400/40 tabular-nums">
              {sharedBadgeLabel}
            </span>
          </Link>
        </Button>
      ) : null}
      {showAdminLink ? (
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/tracks">{t('navAdmin')}</Link>
        </Button>
      ) : null}
      <div className="relative z-[60] shrink-0">
        <UserButton appearance={clerkUserButtonAppearance} />
      </div>
    </div>
  );
}

function NavbarAuth({
  serverSignedIn = false,
  showAdminLink = false,
  favoritesCount = 0,
  sharedTracksCount = 0,
}: NavbarProps) {
  const { isLoaded, isSignedIn } = useAuth();

  const showSignedIn = isLoaded ? isSignedIn : serverSignedIn;

  if (showSignedIn) {
    return (
      <SignedInNav
        showAdminLink={showAdminLink}
        favoritesCount={favoritesCount}
        sharedTracksCount={sharedTracksCount}
      />
    );
  }

  return <SignedOutNav />;
}

export function Navbar({
  serverSignedIn = false,
  showAdminLink = false,
  favoritesCount = 0,
  sharedTracksCount = 0,
}: NavbarProps) {
  const { homeHref } = useCampaignHref();

  return (
    <nav className="relative z-50 border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href={homeHref} className="flex items-center gap-2 text-xl font-bold">
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

        <div className="flex min-h-9 shrink-0 items-center gap-4">
          <NavbarAuth
            serverSignedIn={serverSignedIn}
            showAdminLink={showAdminLink}
            favoritesCount={favoritesCount}
            sharedTracksCount={sharedTracksCount}
          />
        </div>
      </div>
    </nav>
  );
}
