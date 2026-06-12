import { LoginPageClient } from '@/app/login/login-page-client';
import { EN_AUTH_PATHS } from '@/lib/auth-routes';

export default function LoginPage() {
  return <LoginPageClient paths={EN_AUTH_PATHS} />;
}
