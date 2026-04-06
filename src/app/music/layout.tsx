import { ensureClerkProfileSynced } from '@/lib/ensure-clerk-profile';

export default async function MusicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureClerkProfileSynced();
  return <>{children}</>;
}
