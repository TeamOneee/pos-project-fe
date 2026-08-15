import { useLocalSearchParams } from 'expo-router';

import { useTopBarTitle } from '@/components/shell/shell-context';
import { ScreenPlaceholder } from '@/features/placeholder/screen-placeholder';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // The nav label is "Transaksi"; this screen is about one of them.
  useTopBarTitle('Detail Transaksi');

  return (
    <ScreenPlaceholder
      title="Detail Transaksi"
      spec="S-22"
      description={`Rincian item, subtotal, dan total untuk transaksi ${id ?? ''}.`}
      readOnly
    />
  );
}
