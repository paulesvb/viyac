import { ClerkAuthLocalizationProvider } from '@/components/ClerkAuthLocalizationProvider';

export default function SpanishLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClerkAuthLocalizationProvider>{children}</ClerkAuthLocalizationProvider>;
}
