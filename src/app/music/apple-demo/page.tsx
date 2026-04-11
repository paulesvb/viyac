import type { Metadata } from 'next';
import { AppleMusicDemoClient } from '@/components/AppleMusicDemoClient';

export const metadata: Metadata = {
  title: 'Apple Music (demo) | Viyac',
  description:
    'MusicKit proof of concept: developer token from the server and playback in the browser.',
};

export default function AppleMusicDemoPage() {
  return (
    <div className="min-w-0 w-full px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">
            Apple Music integration (demo)
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Validates MusicKit on the web with a server-signed developer token.
            Use this page while you wire curated sections like “Influences.”
          </p>
        </header>
        <AppleMusicDemoClient />
      </div>
    </div>
  );
}
