'use client';

import { SignIn } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function safeRedirectTarget(raw: string | null): string {
  const t = raw?.trim();
  if (t && t.startsWith('/') && !t.startsWith('//')) return t;
  return '/home';
}

function SignInForm() {
  const sp = useSearchParams();
  const redirectTarget = safeRedirectTarget(sp.get('redirect_url'));
  return (
    <SignIn
      routing="path"
      path="/login"
      signUpUrl="/signup"
      forceRedirectUrl={redirectTarget}
      fallbackRedirectUrl={redirectTarget}
    />
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading sign-in…</p>
        }
      >
        <SignInForm />
      </Suspense>
    </div>
  );
}
