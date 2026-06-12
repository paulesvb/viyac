import { LoginPageClient } from '@/app/login/login-page-client';
import { ES_AUTH_PATHS } from '@/lib/auth-routes';

export default function SpanishLoginPage() {
  return <LoginPageClient paths={ES_AUTH_PATHS} />;
}
