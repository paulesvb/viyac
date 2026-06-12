'use client';

import { useMemo } from 'react';

import { useBrowserLanguage } from '@/hooks/use-browser-language';
import { translate, translateParams, type TranslationKey } from '@/lib/i18n';

export type TranslateFn = ((key: TranslationKey) => string) & {
  params: (key: TranslationKey, params: Record<string, string>) => string;
};

/** Returns a stable `t(key)` bound to the current browser language (default English). */
export function useTranslate(): TranslateFn {
  const lang = useBrowserLanguage();

  return useMemo(() => {
    const t = ((key: TranslationKey) => translate(lang, key)) as TranslateFn;
    t.params = (key: TranslationKey, params: Record<string, string>) =>
      translateParams(lang, key, params);
    return t;
  }, [lang]);
}
