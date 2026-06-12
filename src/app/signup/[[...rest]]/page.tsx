import { SignupPageClient } from '@/app/signup/signup-page-client';
import { EN_AUTH_PATHS } from '@/lib/auth-routes';

export default function SignupPage() {
  return <SignupPageClient paths={EN_AUTH_PATHS} />;
}
