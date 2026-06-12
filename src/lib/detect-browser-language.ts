export type SupportedLanguage = 'en' | 'es';

export function detectBrowserLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') {
    return 'en';
  }

  const browserLanguage = window.navigator.language.toLowerCase();
  return browserLanguage.startsWith('es') ? 'es' : 'en';
}
