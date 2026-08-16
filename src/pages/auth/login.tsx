import { AuthSplitLayout } from '@/components/layouts/auth-split-layout';
import { PublicOnlyGuard } from '@/components/pages/auth/route-guard';
import { LoginForm } from '@/components/pages/auth/login-form';

export default function LoginPage() {
  return (
    <PublicOnlyGuard>
      <AuthSplitLayout>
        <LoginForm />
      </AuthSplitLayout>
    </PublicOnlyGuard>
  );
}
