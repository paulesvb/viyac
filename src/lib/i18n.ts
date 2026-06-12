import translations from '@/i18n/translations.json';
import type { SupportedLanguage } from '@/lib/detect-browser-language';

type TranslationEntry = { en: string; es: string };
export type TranslationKey = keyof typeof translations;

/** Default English; Spanish only when explicitly selected via `lang`. */
export function translate(lang: SupportedLanguage, key: TranslationKey): string {
  const entry = translations[key] as TranslationEntry | undefined;
  if (!entry) return String(key);
  return entry[lang] ?? entry.en ?? String(key);
}

/** Replaces `{name}` placeholders in translated strings. */
export function translateParams(
  lang: SupportedLanguage,
  key: TranslationKey,
  params: Record<string, string>,
): string {
  let text = translate(lang, key);
  for (const [name, value] of Object.entries(params)) {
    text = text.replaceAll(`{${name}}`, value);
  }
  return text;
}

const COLLECTION_BADGE_KEYS = [
  'collectionBadgeNewGenesisInnerCircle',
] as const satisfies readonly TranslationKey[];

/** Maps known admin badge labels to the dictionary; unknown labels pass through. */
export function translateCollectionBadge(
  label: string,
  lang: SupportedLanguage,
): string {
  const trimmed = label.trim();
  if (!trimmed) return trimmed;

  for (const key of COLLECTION_BADGE_KEYS) {
    if (translate('en', key) === trimmed) {
      return translate(lang, key);
    }
  }

  return trimmed;
}
