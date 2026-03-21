'use client';

import { useEffect, useMemo, useState } from 'react';
import translations from '@/i18n/translations.json';

type SupportedLanguage = 'en' | 'es';

function detectBrowserLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') {
    return 'en';
  }

  const browserLanguage = window.navigator.language.toLowerCase();
  return browserLanguage.startsWith('es') ? 'es' : 'en';
}

export function useTranslation(key: string): string {
  const [language, setLanguage] = useState<SupportedLanguage>('en');

  useEffect(() => {
    setLanguage(detectBrowserLanguage());
  }, []);

  const translatedValue = useMemo(() => {
    const entry = (translations as Record<string, Record<SupportedLanguage, string>>)[key];

    if (!entry) {
      return key;
    }

    return entry[language] ?? entry.en ?? key;
  }, [key, language]);

  return translatedValue;
}
