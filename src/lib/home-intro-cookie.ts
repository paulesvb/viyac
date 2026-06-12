/** Anonymous “don’t show again” for the Home welcome card. */
export const HOME_INTRO_DISMISSED_COOKIE = 'viyac_home_intro_dismissed';

export function isHomeIntroDismissedInCookie(value: string | undefined): boolean {
  return value === '1';
}

export const homeIntroDismissedCookieOptions = {
  path: '/',
  maxAge: 60 * 60 * 24 * 400,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
};
