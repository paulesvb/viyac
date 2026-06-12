'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';

import { useClerkAuthLocale } from '@/hooks/use-clerk-auth-locale';
import { clerkAuthAppearance } from '@/lib/clerk-auth-appearance';
import { useHomeHref } from '@/hooks/use-home-href';

export function ClerkRootProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const afterSignOutUrl = useHomeHref();
  const { localization } = useClerkAuthLocale();

  return (
    <ClerkProvider
      appearance={{ baseTheme: dark, ...clerkAuthAppearance }}
      dynamic
      afterSignOutUrl={afterSignOutUrl}
      localization={localization}
    >
      {children}
    </ClerkProvider>
  );
}
