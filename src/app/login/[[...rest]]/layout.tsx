import { ClerkAuthLocalizationProvider } from '@/components/ClerkAuthLocalizationProvider';

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClerkAuthLocalizationProvider>{children}</ClerkAuthLocalizationProvider>;
}
