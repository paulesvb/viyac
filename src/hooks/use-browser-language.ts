'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import type { SupportedLanguage } from '@/lib/detect-browser-language';
import {
  resolveUiLanguage,
  resolveUiLanguageFromPath,
} from '@/lib/ui-language';

export function useBrowserLanguage(): SupportedLanguage {
  const pathname = usePathname();
  const [lang, setLang] = useState<SupportedLanguage>(() =>
    resolveUiLanguageFromPath(pathname),
  );

  useEffect(() => {
    setLang(resolveUiLanguage(pathname));
  }, [pathname]);

  return lang;
}
