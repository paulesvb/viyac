'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

import {
  isSpanishUiContext,
  isSpanishUiContextFromPath,
} from '@/lib/ui-language';

/** Locale-aware home, about, and legal URLs for the Spanish campaign. */
export function useCampaignHref() {
  const pathname = usePathname();
  const [spanishUi, setSpanishUi] = useState(() =>
    isSpanishUiContextFromPath(pathname),
  );

  useEffect(() => {
    setSpanishUi(isSpanishUiContext(pathname));
  }, [pathname]);

  return useMemo(
    () => ({
      homeHref: spanishUi ? '/es/home' : '/home',
      aboutHref: spanishUi ? '/es/about' : '/about',
      legalHref: spanishUi ? '/es/legal' : '/legal',
    }),
    [spanishUi],
  );
}
