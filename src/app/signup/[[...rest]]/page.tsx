'use client';

import { SignUp } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function safeRedirectTarget(raw: string | null): string {
  const t = raw?.trim();
  if (t && t.startsWith('/') && !t.startsWith('//')) return t;
  return '/home';
}

function SignUpForm() {
  const sp = useSearchParams();
  const redirectTarget = safeRedirectTarget(sp.get('redirect_url'));
  return (
    <SignUp
      routing="path"
      path="/signup"
      signInUrl="/login"
      forceRedirectUrl={redirectTarget}
      fallbackRedirectUrl={redirectTarget}
    />
  );
}

export default function SignupPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading sign-up…</p>
        }
      >
        <SignUpForm />
      </Suspense>
    </div>
  );
}
