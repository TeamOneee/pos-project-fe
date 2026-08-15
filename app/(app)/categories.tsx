import { useAuth } from '@/components/auth/auth-provider';
import { ScreenPlaceholder } from '@/features/placeholder/screen-placeholder';
import { canManage } from '@/lib/auth/permissions';

export default function CategoriesScreen() {
  const { role } = useAuth();
  const readOnly = role !== null && !canManage(role, 'catalog');

  return (
    <ScreenPlaceholder
      title="Kategori"
      spec="S-13"
      description="Kategori produk merchant."
      readOnly={readOnly}
    />
  );
}
