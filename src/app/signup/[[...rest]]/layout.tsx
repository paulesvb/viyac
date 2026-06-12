import { ClerkAuthLocalizationProvider } from '@/components/ClerkAuthLocalizationProvider';

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClerkAuthLocalizationProvider>{children}</ClerkAuthLocalizationProvider>;
}
