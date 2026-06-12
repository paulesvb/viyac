'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import {
  getLoginHref,
  getLoginPathFromPath,
  getSignupHref,
  getSignupPathFromPath,
  isSpanishUiContext,
  isSpanishUiContextFromPath,
} from '@/lib/ui-language';

/** Login/signup URLs that preserve the Spanish campaign path when browsing under `/es/*`. */
export function useAuthHref() {
  const pathname = usePathname();
  const [spanishUi, setSpanishUi] = useState(() =>
    isSpanishUiContextFromPath(pathname),
  );

  useEffect(() => {
    setSpanishUi(isSpanishUiContext(pathname));
  }, [pathname]);

  const pathContext = spanishUi ? '/es/home' : '/home';
  const loginPath = spanishUi
    ? getLoginPathFromPath('/es/home')
    : getLoginPathFromPath('/home');
  const signupPath = spanishUi
    ? getSignupPathFromPath('/es/home')
    : getSignupPathFromPath('/home');

  const loginHref = useCallback(
    (redirectPath?: string) => getLoginHref(pathContext, redirectPath),
    [pathContext],
  );

  const signupHref = useCallback(
    (redirectPath?: string) => getSignupHref(pathContext, redirectPath),
    [pathContext],
  );

  return {
    loginPath,
    signupPath,
    loginHref,
    signupHref,
  };
}
