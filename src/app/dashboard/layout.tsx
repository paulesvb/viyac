import { ensureClerkProfileSynced } from '@/lib/ensure-clerk-profile';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureClerkProfileSynced();
  return <>{children}</>;
}
