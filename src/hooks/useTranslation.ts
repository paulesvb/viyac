'use client';

import { useMemo } from 'react';

import { useBrowserLanguage } from '@/hooks/use-browser-language';
import { translate, type TranslationKey } from '@/lib/i18n';

export function useTranslation(key: TranslationKey): string {
  const language = useBrowserLanguage();

  return useMemo(() => translate(language, key), [key, language]);
}
