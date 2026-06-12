import type { Metadata } from 'next';

import { AboutPageClient } from '@/app/about/about-page-client';

export const metadata: Metadata = {
  title: 'About | VIYAC',
  description:
    'VIYAC manifesto — hybrid soul where human songwriting meets future-retro production.',
};

export default function AboutPage() {
  return <AboutPageClient />;
}
