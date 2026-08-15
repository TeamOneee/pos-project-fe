/**
 * "Uang Diterima" and the change owed.
 *
 * The amount is typed as digits and grouped as it goes, so the cashier reads
 * `50.000` rather than `50000` while a customer waits. It never becomes a
 * float: the input holds an integer number of rupiah, and the change is one
 * subtraction.
 *
 * The change row is the point of the panel. Short payment is not an error
 * state to be discovered on submit — it says how much is missing, and the
 * confirm button is refused until it is not.
 */

import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { changeFor, isShort } from '@/features/checkout/checkout-machine';
import { formatIDR, formatIDRCompactUnit, type Rupiah } from '@/lib/money';

/** The notes a cashier reaches for most often. */
const QUICK_AMOUNTS: Rupiah[] = [50_000, 100_000];

type CashPanelProps = {
  total: Rupiah;
  received: Rupiah | null;
  onChange: (received: Rupiah | null) => void;
  disabled?: boolean;
};

export function CashPanel({ total, received, onChange, disabled = false }: CashPanelProps) {
  const short = isShort(total, received);
  const change = changeFor(total, received);

  return (
    <View className="gap-md">
      <View className="gap-xs">
        <Text variant="label" tone="muted">
          Uang Diterima
        </Text>

        <View className="flex-row items-center gap-sm rounded-md border border-border bg-surface px-md">
          <Text variant="mono" tone="muted" className="type-h3">
            Rp
          </Text>
          <Input
            value={received === null ? '' : formatIDRCompactUnit(received)}
            onChangeText={(text) => onChange(parseDigits(text))}
            placeholder="0"
            keyboardType="number-pad"
            inputMode="numeric"
            accessibilityLabel="Uang diterima"
            editable={!disabled}
            numeric
            className="h-12 flex-1 border-0 bg-transparent px-0 type-h2"
          />
        </View>
      </View>

      <View className="flex-row flex-wrap gap-sm">
        {QUICK_AMOUNTS.map((amount) => (
          <Button
            key={amount}
            variant="outline"
            size="sm"
            disabled={disabled}
            onPress={() => onChange(amount)}
          >
            <Text>{formatIDR(amount)}</Text>
          </Button>
        ))}
        <Button variant="outline" size="sm" disabled={disabled} onPress={() => onChange(total)}>
          <Text>Uang Pas</Text>
        </Button>
      </View>

      <View className="flex-row items-center justify-between gap-md rounded-md bg-subtle px-md py-sm">
        <Text variant="body" tone="muted">
          {short ? 'Kurang' : 'Kembalian'}
        </Text>
        {/* Always a figure with a word beside it, never a bare colour. */}
        <Text variant="mono" tone={short ? 'danger' : 'success'} className="type-h2">
          {short ? `Kurang ${formatIDR(-change)}` : formatIDR(change)}
        </Text>
      </View>
    </View>
  );
}

/**
 * Digits only. An empty field is null rather than zero, so "nothing typed yet"
 * and "explicitly nothing" stay distinguishable and the confirm button can
 * refuse the first without complaining about the second.
 */
function parseDigits(text: string): Rupiah | null {
  const digits = text.replace(/\D/g, '');
  if (digits.length === 0) return null;

  const value = Number(digits);
  return Number.isSafeInteger(value) ? value : null;
}
