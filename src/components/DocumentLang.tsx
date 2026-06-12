'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import {
  clearPersistedCampaignLang,
  isSpanishCampaignPath,
  persistSpanishCampaignLang,
  resolveUiLanguage,
} from '@/lib/ui-language';

/** Syncs campaign language persistence and `<html lang>`. */
export function DocumentLang() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/home') {
      clearPersistedCampaignLang();
    } else if (isSpanishCampaignPath(pathname)) {
      persistSpanishCampaignLang();
    }

    document.documentElement.lang = resolveUiLanguage(pathname);
  }, [pathname]);

  return null;
}
