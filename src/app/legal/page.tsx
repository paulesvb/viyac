import type { Metadata } from 'next';

import { LegalPageClient } from '@/app/legal/legal-page-client';

export const metadata: Metadata = {
  title: 'Legal | VIYAC',
  description: 'VIYAC legal disclaimer, Inner Circle access, and terms.',
};

export default function LegalPage() {
  return <LegalPageClient />;
}
