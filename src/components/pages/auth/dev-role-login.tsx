/** Development-only quick sign-in: one tap per role. */

import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useLogin } from '@/hooks/use-auth';
import { landingRoute, type Role } from '@/lib/permissions';

const DEV_ACCOUNTS: { label: string; role: Role; email: string; password: string }[] = [
  { label: 'Owner', role: 'OWNER', email: 'owner@indomart.com', password: 'password123' },
  { label: 'Admin', role: 'ADMIN', email: 'sari@indomart.com', password: 'password123' },
  { label: 'Kasir', role: 'CASHIER', email: 'budi@indomart.com', password: 'password123' },
];

export function DevRoleLogin() {
  const navigate = useNavigate();
  const login = useLogin();

  const signIn = (email: string, password: string) =>
    login.mutate(
      { email, password },
      { onSuccess: (result) => navigate(landingRoute(result.role), { replace: true }) }
    );

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-col gap-xs">
        <Text variant="body-strong" tone="muted">
          Login cepat (development)
        </Text>
        <Text variant="caption" tone="muted">
          Pilih role untuk langsung masuk.
        </Text>
      </div>

      <div className="flex flex-row flex-wrap gap-sm">
        {DEV_ACCOUNTS.map((account) => (
          <Button
            key={account.role}
            variant="outline"
            size="sm"
            loading={login.isPending}
            onClick={() => signIn(account.email, account.password)}
          >
            {account.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
