import { enUS, esES } from '@clerk/localizations';

import type { SupportedLanguage } from '@/lib/detect-browser-language';
import { translate } from '@/lib/i18n';

/** Clerk base locale + VIYAC copy from `src/i18n/translations.json`. */
export function getClerkAuthLocalization(lang: SupportedLanguage) {
  const base = lang === 'es' ? esES : enUS;

  return {
    ...base,
    signIn: {
      ...base.signIn,
      start: {
        ...base.signIn?.start,
        title: translate(lang, 'clerkSignInTitle'),
        subtitle: translate(lang, 'clerkSignInSubtitle'),
        actionText: translate(lang, 'clerkSignInActionText'),
        actionLink: translate(lang, 'clerkSignInActionLink'),
      },
    },
    signUp: {
      ...base.signUp,
      start: {
        ...base.signUp?.start,
        title: translate(lang, 'clerkSignUpTitle'),
        subtitle: translate(lang, 'clerkSignUpSubtitle'),
        actionText: translate(lang, 'clerkSignUpActionText'),
        actionLink: translate(lang, 'clerkSignUpActionLink'),
      },
      emailCode: {
        ...base.signUp?.emailCode,
        subtitle: translate(lang, 'clerkSignUpEmailCodeSubtitle'),
      },
    },
  };
}

type AuthPageCopy = {
  eyebrow: string;
  title: string;
  description: string;
  loading: string;
};

export function getAuthPageCopy(
  flow: 'signIn' | 'signUp',
  lang: SupportedLanguage,
): AuthPageCopy {
  if (flow === 'signIn') {
    return {
      eyebrow: translate(lang, 'authEyebrow'),
      title: translate(lang, 'clerkSignInTitle'),
      description: translate(lang, 'clerkSignInSubtitle'),
      loading: translate(lang, 'authSignInLoading'),
    };
  }

  return {
    eyebrow: translate(lang, 'authEyebrow'),
    title: translate(lang, 'clerkSignUpTitle'),
    description: translate(lang, 'clerkSignUpSubtitle'),
    loading: translate(lang, 'authSignUpLoading'),
  };
}
