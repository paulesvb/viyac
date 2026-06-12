import type { Metadata } from 'next';

import { HomePageContent } from '@/app/home/home-page-content';
import { buildLocalizedPageMetadata } from '@/lib/page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildLocalizedPageMetadata({
    lang: 'en',
    titleKey: 'seoHomeTitle',
    descriptionKey: 'seoHomeDescription',
    path: '/home',
  });
}

export default HomePageContent;
