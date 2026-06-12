'use client';

import { useMemo } from 'react';

import { getClerkAuthLocalization } from '@/lib/clerk-auth-localization';
import { useBrowserLanguage } from '@/hooks/use-browser-language';

export function useClerkAuthLocale() {
  const lang = useBrowserLanguage();
  const localization = useMemo(() => getClerkAuthLocalization(lang), [lang]);

  return {
    lang,
    isEnglish: lang === 'en',
    localization,
  };
}
