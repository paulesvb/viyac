import { AuthForm } from '@/components/AuthForm';

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <AuthForm mode="login" />
    </div>
  );
}
