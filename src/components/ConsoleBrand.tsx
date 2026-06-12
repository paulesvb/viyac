'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    __VIYAC_LOGGED__?: boolean;
  }
}

const REPO_URL = 'https://github.com/paulesvb/viyac';

export function ConsoleBrand() {
  useEffect(() => {
    if (typeof window === 'undefined' || window.__VIYAC_LOGGED__) return;
    window.__VIYAC_LOGGED__ = true;

    const titleStyle = `
        color: #00E5FF;
        background: #0A0A0A;
        font-family: monospace;
        font-size: 14px;
        font-weight: bold;
        padding: 8px 12px;
        border: 1px solid #222;
        border-radius: 4px;
      `;

    const textStyle = `
        color: #A1A1AA;
        font-family: monospace;
        font-size: 12px;
        padding: 4px 0;
      `;

    const linkStyle = `
        color: #FFFFFF;
        font-family: monospace;
        font-size: 12px;
        font-weight: bold;
        text-decoration: underline;
      `;

    console.log('%cVIYAC // HYBRID ROCK & ENGINEERING', titleStyle);
    console.log(
      '%c[System Architecture]: Next.js (App Router), Clerk Auth, Supabase Storage, Tailwind CSS.',
      textStyle,
    );
    console.log(
      '%cCrafted from scratch by Paul Esteban Villacreces — full stack engineer & hybrid artist.',
      textStyle,
    );
    console.log(`%cRepository: ${REPO_URL}`, linkStyle);
  }, []);

  return null;
}
