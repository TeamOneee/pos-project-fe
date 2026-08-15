import { AuthSplitLayout } from '@/features/auth/auth-split-layout';
import { RegisterForm } from '@/features/auth/register-form';

export default function RegisterScreen() {
  return (
    <AuthSplitLayout>
      <RegisterForm />
    </AuthSplitLayout>
  );
}
