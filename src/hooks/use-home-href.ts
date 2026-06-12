'use client';

import { useCampaignHref } from '@/hooks/use-campaign-href';

/** Home URL that preserves the Spanish campaign path when browsing under `/es/*`. */
export function useHomeHref(): string {
  return useCampaignHref().homeHref;
}
