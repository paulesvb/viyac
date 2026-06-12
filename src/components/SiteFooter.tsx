'use client';

import Link from 'next/link';

import { useCampaignHref } from '@/hooks/use-campaign-href';
import { useTranslate } from '@/hooks/use-translate';

const siteFooterLinks = [
  { key: 'about' as const, labelKey: 'navAbout' as const },
  { key: 'legal' as const, labelKey: 'navLegal' as const },
] as const;

export function SiteFooter() {
  const t = useTranslate();
  const { aboutHref, legalHref } = useCampaignHref();
  const year = new Date().getFullYear();

  const hrefByKey = {
    about: aboutHref,
    legal: legalHref,
  } as const;

  return (
    <footer className="mt-auto border-t bg-background">
      <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row sm:py-8">
        <p className="text-sm text-muted-foreground">
          &copy; {year} Viyac. {t('footerCopyright')}
        </p>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {siteFooterLinks.map(({ key, labelKey }) => (
              <li key={key}>
                <Link
                  href={hrefByKey[key]}
                  className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                >
                  {t(labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
