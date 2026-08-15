import { useAuth } from '@/components/auth/auth-provider';
import { ScreenPlaceholder } from '@/features/placeholder/screen-placeholder';
import { canManage } from '@/lib/auth/permissions';

export default function InventoryScreen() {
  const { role } = useAuth();
  const readOnly = role !== null && !canManage(role, 'inventory');

  return (
    <ScreenPlaceholder
      title="Inventori"
      spec="S-15"
      description="Stok per outlet. GET /inventory selalu meminta satu outlet, jadi layar ini memaksa pemilihan outlet lebih dulu."
      readOnly={readOnly}
    />
  );
}
