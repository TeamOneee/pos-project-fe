import { AuthSplitLayout } from '@/components/layouts/auth-split-layout';
import { PublicOnlyGuard } from '@/components/pages/auth/route-guard';
import { RegisterForm } from '@/components/pages/auth/register-form';

export default function RegisterPage() {
  return (
    <PublicOnlyGuard>
      <AuthSplitLayout>
        <RegisterForm />
      </AuthSplitLayout>
    </PublicOnlyGuard>
  );
}
