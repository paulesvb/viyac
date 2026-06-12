'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import {
  getCollectionHrefFromPath,
  isSpanishUiContext,
  isSpanishUiContextFromPath,
} from '@/lib/ui-language';

/** Collection URL that preserves the Spanish campaign path when browsing under `/es/*`. */
export function useCollectionHref() {
  const pathname = usePathname();
  const [spanishUi, setSpanishUi] = useState(() =>
    isSpanishUiContextFromPath(pathname),
  );

  useEffect(() => {
    setSpanishUi(isSpanishUiContext(pathname));
  }, [pathname]);

  return useCallback(
    (slug: string, signedIn: boolean) =>
      getCollectionHrefFromPath(
        spanishUi ? '/es/home' : '/home',
        slug,
        signedIn,
      ),
    [spanishUi],
  );
}
