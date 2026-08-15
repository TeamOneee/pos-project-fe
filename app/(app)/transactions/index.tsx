import { useAuth } from '@/components/auth/auth-provider';
import { ScreenPlaceholder } from '@/features/placeholder/screen-placeholder';
import { dataScope } from '@/lib/auth/permissions';

export default function TransactionsScreen() {
  const { role } = useAuth();
  const ownOutletOnly = role !== null && dataScope(role) === 'own-outlet';

  return (
    <ScreenPlaceholder
      title="Transaksi"
      spec="S-21"
      description={
        ownOutletOnly
          ? 'Riwayat transaksi di outlet Anda.'
          : 'Riwayat transaksi seluruh outlet, dengan filter tanggal, outlet, dan kasir.'
      }
      readOnly
    />
  );
}
