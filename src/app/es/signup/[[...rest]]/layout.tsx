import { ClerkAuthLocalizationProvider } from '@/components/ClerkAuthLocalizationProvider';

export default function SpanishSignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClerkAuthLocalizationProvider>{children}</ClerkAuthLocalizationProvider>;
}
