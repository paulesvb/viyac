'use client';

import Link from 'next/link';

import { useTranslation } from '@/hooks/useTranslation';
import { useHomeHref } from '@/hooks/use-home-href';

export function HomeBackLink() {
  const label = useTranslation('navHomeBack');
  const homeHref = useHomeHref();

  return (
    <Link
      href={homeHref}
      className="inline-block text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
    >
      {label}
    </Link>
  );
}
