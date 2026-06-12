import type { Metadata } from 'next';

import type { SupportedLanguage } from '@/lib/detect-browser-language';
import { translate, type TranslationKey } from '@/lib/i18n';
import { getSiteUrl } from '@/lib/site-url';

const HOME_LANGUAGE_PATHS = [
  { lang: 'en' as const, path: '/home' },
  { lang: 'es' as const, path: '/es/home' },
];

type LocalizedPageMetadataOptions = {
  lang: SupportedLanguage;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  path: string;
};

/** Page-level SEO from `translations.json`, with en/es hreflang alternates for Home. */
export function buildLocalizedPageMetadata({
  lang,
  titleKey,
  descriptionKey,
  path,
}: LocalizedPageMetadataOptions): Metadata {
  const title = translate(lang, titleKey);
  const description = translate(lang, descriptionKey);
  const siteUrl = getSiteUrl();

  const languages: Record<string, string> = {
    'x-default': `${siteUrl}/home`,
  };
  for (const alt of HOME_LANGUAGE_PATHS) {
    languages[alt.lang] = `${siteUrl}${alt.path}`;
  }

  return {
    title,
    description,
    alternates: {
      canonical: path,
      languages,
    },
    openGraph: {
      title,
      description,
      url: path,
      locale: lang === 'es' ? 'es_ES' : 'en_US',
      alternateLocale: lang === 'es' ? ['en_US'] : ['es_ES'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}
