import { SignupPageClient } from '@/app/signup/signup-page-client';
import { ES_AUTH_PATHS } from '@/lib/auth-routes';

export default function SpanishSignupPage() {
  return <SignupPageClient paths={ES_AUTH_PATHS} />;
}
