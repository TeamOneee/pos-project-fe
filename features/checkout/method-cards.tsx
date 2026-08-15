/**
 * Payment method: two large cards, not a dropdown.
 *
 * This is one tap in the middle of a queue, so both options are on screen at
 * once with a target far larger than the 44px minimum. Selection is carried by
 * a border, a fill *and* the label — never colour alone.
 *
 * Non-Tunai is a record, not a transaction: there is no gateway, no QR
 * generation and no terminal anywhere in this product.
 */

import { Banknote, QrCode } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { PaymentMethod } from '@/features/checkout/checkout-machine';
import { cn } from '@/lib/utils';

type MethodCardsProps = {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  disabled?: boolean;
};

export function MethodCards({ value, onChange, disabled = false }: MethodCardsProps) {
  return (
    <View className="gap-md tablet:flex-row">
      <MethodCard
        icon={Banknote}
        label="Tunai"
        selected={value === 'CASH'}
        disabled={disabled}
        onPress={() => onChange('CASH')}
      />
      <MethodCard
        icon={QrCode}
        label="Non-Tunai"
        caption="QRIS / Transfer / Kartu"
        selected={value === 'NON_CASH'}
        disabled={disabled}
        onPress={() => onChange('NON_CASH')}
      />
    </View>
  );
}

function MethodCard({
  icon,
  label,
  caption,
  selected,
  disabled,
  onPress,
}: {
  icon: React.ComponentProps<typeof Icon>['as'];
  label: string;
  caption?: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      role="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={caption ? `${label}, ${caption}` : label}
      disabled={disabled}
      onPress={onPress}
      className={cn(
        'min-h-[96px] flex-1 items-center justify-center gap-xs rounded-lg border-2 p-md',
        selected ? 'border-accent bg-accent-subtle' : 'border-border bg-surface',
        !disabled && !selected && 'active:bg-subtle web:hover:border-border-strong',
        disabled && 'opacity-50'
      )}
    >
      <Icon as={icon} size={24} className={selected ? 'text-accent' : 'text-fg-muted'} />
      <Text variant="body-strong" tone={selected ? 'accent' : 'default'}>
        {label}
      </Text>
      {caption && (
        <Text variant="caption" tone="muted" className="text-center">
          {caption}
        </Text>
      )}
    </Pressable>
  );
}
