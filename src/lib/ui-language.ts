import {
  detectBrowserLanguage,
  type SupportedLanguage,
} from '@/lib/detect-browser-language';

const CAMPAIGN_LANG_STORAGE_KEY = 'viyac_ui_lang';

/** True for `/es` and `/es/...` marketing routes. */
export function isSpanishCampaignPath(
  pathname: string | null | undefined,
): boolean {
  if (!pathname) return false;
  return pathname === '/es' || pathname.startsWith('/es/');
}

function readPersistedCampaignLang(): SupportedLanguage | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(CAMPAIGN_LANG_STORAGE_KEY) === 'es'
      ? 'es'
      : null;
  } catch {
    return null;
  }
}

/** Remember Spanish campaign language for this tab (signup, login, etc.). */
export function persistSpanishCampaignLang(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(CAMPAIGN_LANG_STORAGE_KEY, 'es');
  } catch {
    /* ignore quota / privacy mode */
  }
}

export function clearPersistedCampaignLang(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(CAMPAIGN_LANG_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Pathname only — matches SSR and the first client paint to avoid hydration
 * mismatches. Does not read sessionStorage or `navigator`.
 */
export function resolveUiLanguageFromPath(
  pathname: string | null | undefined,
): SupportedLanguage {
  return isSpanishCampaignPath(pathname) ? 'es' : 'en';
}

/**
 * `/es/*` forces Spanish and persists for the tab.
 * Otherwise uses persisted campaign Spanish, then browser language.
 * Client-only extras; do not use for the initial render of client components.
 */
export function resolveUiLanguage(
  pathname: string | null | undefined,
): SupportedLanguage {
  if (isSpanishCampaignPath(pathname)) return 'es';
  if (readPersistedCampaignLang() === 'es') return 'es';
  return detectBrowserLanguage();
}

export function isSpanishUiContextFromPath(
  pathname: string | null | undefined,
): boolean {
  return isSpanishCampaignPath(pathname);
}

/** Spanish UI from path, persisted campaign tab lang, or browser — client only after mount. */
export function isSpanishUiContext(
  pathname: string | null | undefined,
): boolean {
  return (
    isSpanishCampaignPath(pathname) || readPersistedCampaignLang() === 'es'
  );
}

export function getHomeHrefFromPath(
  pathname: string | null | undefined,
): string {
  return isSpanishCampaignPath(pathname) ? '/es/home' : '/home';
}

export function getHomeHref(pathname: string | null | undefined): string {
  if (isSpanishUiContext(pathname)) return '/es/home';
  return '/home';
}

export function getLoginPathFromPath(
  pathname: string | null | undefined,
): string {
  return isSpanishCampaignPath(pathname) ? '/es/login' : '/login';
}

export function getLoginPath(pathname: string | null | undefined): string {
  return isSpanishUiContext(pathname) ? '/es/login' : '/login';
}

export function getSignupPathFromPath(
  pathname: string | null | undefined,
): string {
  return isSpanishCampaignPath(pathname) ? '/es/signup' : '/signup';
}

export function getSignupPath(pathname: string | null | undefined): string {
  return isSpanishUiContext(pathname) ? '/es/signup' : '/signup';
}

function buildLoginRedirect(loginPath: string, redirectPath: string): string {
  return `${loginPath}?redirect_url=${encodeURIComponent(redirectPath)}`;
}

export function getLoginHref(
  pathname: string | null | undefined,
  redirectPath?: string,
): string {
  const loginPath = getLoginPath(pathname);
  if (!redirectPath) return loginPath;
  return buildLoginRedirect(loginPath, redirectPath);
}

export function getSignupHref(
  pathname: string | null | undefined,
  redirectPath?: string,
): string {
  const signupPath = getSignupPath(pathname);
  if (!redirectPath) return signupPath;
  return `${signupPath}?redirect_url=${encodeURIComponent(redirectPath)}`;
}

export function getAboutPathFromPath(
  pathname: string | null | undefined,
): string {
  return isSpanishCampaignPath(pathname) ? '/es/about' : '/about';
}

export function getAboutPath(pathname: string | null | undefined): string {
  return isSpanishUiContext(pathname) ? '/es/about' : '/about';
}

export function getLegalPathFromPath(
  pathname: string | null | undefined,
): string {
  return isSpanishCampaignPath(pathname) ? '/es/legal' : '/legal';
}

export function getLegalPath(pathname: string | null | undefined): string {
  return isSpanishUiContext(pathname) ? '/es/legal' : '/legal';
}

export function getCollectionPathFromPath(
  pathname: string | null | undefined,
  slug: string,
): string {
  const encoded = encodeURIComponent(slug);
  if (isSpanishCampaignPath(pathname)) {
    return `/es/music/collections/${encoded}`;
  }
  return `/music/collections/${encoded}`;
}

export function getCollectionPath(
  pathname: string | null | undefined,
  slug: string,
): string {
  const encoded = encodeURIComponent(slug);
  if (isSpanishUiContext(pathname)) {
    return `/es/music/collections/${encoded}`;
  }
  return `/music/collections/${encoded}`;
}

export function getCollectionHrefFromPath(
  pathname: string | null | undefined,
  slug: string,
  signedIn: boolean,
): string {
  const path = getCollectionPathFromPath(pathname, slug);
  return signedIn
    ? path
    : buildLoginRedirect(getLoginPathFromPath(pathname), path);
}

export function getCollectionHref(
  pathname: string | null | undefined,
  slug: string,
  signedIn: boolean,
): string {
  const path = getCollectionPath(pathname, slug);
  return signedIn
    ? path
    : buildLoginRedirect(getLoginPath(pathname), path);
}
