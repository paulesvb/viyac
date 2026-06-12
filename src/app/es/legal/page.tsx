import type { Metadata } from 'next';

import { LegalPageClient } from '@/app/legal/legal-page-client';
import { translate } from '@/lib/i18n';

export const metadata: Metadata = {
  title: `${translate('es', 'legalDisclaimer')} | VIYAC`,
  description:
    'Aviso legal de VIYAC, acceso Inner Circle y términos.',
};

export default function SpanishLegalPage() {
  return <LegalPageClient />;
}
