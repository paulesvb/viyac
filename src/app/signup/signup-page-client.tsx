'use client';

import { SignUp } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { clerkAuthAppearance } from '@/lib/clerk-auth-appearance';
import { getAuthPageCopy } from '@/lib/clerk-auth-localization';
import type { AuthFlowPaths } from '@/lib/auth-routes';
import { useClerkAuthLocale } from '@/hooks/use-clerk-auth-locale';

function safeRedirectTarget(raw: string | null, defaultHome: string): string {
  const t = raw?.trim();
  if (t && t.startsWith('/') && !t.startsWith('//')) return t;
  return defaultHome;
}

function SignUpForm({ paths }: { paths: AuthFlowPaths }) {
  const sp = useSearchParams();
  const redirectTarget = safeRedirectTarget(
    sp.get('redirect_url'),
    paths.defaultHomePath,
  );

  return (
    <SignUp
      routing="path"
      path={paths.signUpPath}
      signInUrl={paths.signInPath}
      forceRedirectUrl={redirectTarget}
      fallbackRedirectUrl={redirectTarget}
      appearance={clerkAuthAppearance}
    />
  );
}

function SignupPageContent({ paths }: { paths: AuthFlowPaths }) {
  const { lang } = useClerkAuthLocale();
  const copy = getAuthPageCopy('signUp', lang);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 max-w-md space-y-3 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/90">
          {copy.eyebrow}
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {copy.title}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          {copy.description}
        </p>
      </div>
      <SignUpForm paths={paths} />
    </div>
  );
}

export function SignupPageClient({ paths }: { paths: AuthFlowPaths }) {
  const copy = getAuthPageCopy('signUp', 'en');

  return (
    <Suspense
      fallback={
        <p className="py-12 text-center text-sm text-muted-foreground">
          {copy.loading}
        </p>
      }
    >
      <SignupPageContent paths={paths} />
    </Suspense>
  );
}
