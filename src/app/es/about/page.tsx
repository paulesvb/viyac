import type { Metadata } from 'next';

import { AboutPageClient } from '@/app/about/about-page-client';
import { translate } from '@/lib/i18n';

export const metadata: Metadata = {
  title: `${translate('es', 'aboutPageTitle')} | VIYAC`,
  description:
    'Manifiesto VIYAC — hybrid soul donde la composición humana se encuentra con la producción future-retro.',
};

export default function SpanishAboutPage() {
  return <AboutPageClient />;
}
