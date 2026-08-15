import { useAuth } from '@/components/auth/auth-provider';
import { ScreenPlaceholder } from '@/features/placeholder/screen-placeholder';
import { canManage } from '@/lib/auth/permissions';

export default function ProductsScreen() {
  const { role } = useAuth();
  // The Owner can look at the catalog but not change it; only an Admin manages
  // products. The badge makes that visible rather than leaving dead buttons.
  const readOnly = role !== null && !canManage(role, 'catalog');

  return (
    <ScreenPlaceholder
      title="Produk"
      spec="S-11"
      description="Katalog produk merchant, dengan SKU, harga, dan kategori."
      readOnly={readOnly}
    />
  );
}
