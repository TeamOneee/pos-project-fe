import { AuthSplitLayout } from '@/features/auth/auth-split-layout';
import { LoginForm } from '@/features/auth/login-form';

export default function LoginScreen() {
  return (
    <AuthSplitLayout>
      <LoginForm />
    </AuthSplitLayout>
  );
}
