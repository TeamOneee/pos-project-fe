/**
 * S-19 · Payment succeeded.
 *
 * Celebratory but quick to leave: the primary action starts the next sale,
 * because the next customer is already waiting. Printing and sharing are
 * secondary and never block that.
 *
 * The breakdown is collapsed by default. It contains Subtotal and Total and
 * nothing between them — rule 2, and a receipt is exactly where a stray
 * discount row would do the most damage.
 */

import { Check, ChevronDown, ChevronUp } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import type { ReceiptData } from '@/features/receipt/receipt-data';
import { formatDateTime } from '@/lib/date';
import { formatIDR } from '@/lib/money';
import { formatCount } from '@/lib/number';

type SuccessDialogProps = {
  open: boolean;
  receipt: ReceiptData | null;
  onNewTransaction: () => void;
  onPrint: () => void;
  onShare: () => void;
  /** False on browsers with no Web Share API; the button says so instead. */
  canShare: boolean;
  busy?: boolean;
};

export function SuccessDialog({
  open,
  receipt,
  onNewTransaction,
  onPrint,
  onShare,
  canShare,
  busy = false,
}: SuccessDialogProps) {
  const [expanded, setExpanded] = React.useState(false);

  if (!receipt) return null;

  return (
    // Not dismissable by overlay: leaving is a decision, and the only way out
    // starts the next sale.
    <Dialog open={open}>
      <DialogContent hideClose className="max-w-[480px]">
        <View className="items-center gap-md">
          <SuccessCheck />

          <Text variant="h1">Pembayaran Berhasil</Text>

          <Text variant="mono" tone="muted">
            {receipt.transactionNumber}
          </Text>

          <Text variant="mono" className="type-display">
            {formatIDR(receipt.total)}
          </Text>

          {receipt.change !== null && (
            <View className="flex-row items-center gap-sm">
              <Text variant="body" tone="muted">
                Kembalian
              </Text>
              <Text variant="mono" tone="success" className="type-h2">
                {formatIDR(receipt.change)}
              </Text>
            </View>
          )}
        </View>

        <Button variant="ghost" onPress={() => setExpanded((value) => !value)}>
          <Text>Lihat Rincian</Text>
          <Icon as={expanded ? ChevronUp : ChevronDown} size={16} className="text-fg-muted" />
        </Button>

        {expanded && <ReceiptBreakdown receipt={receipt} />}

        <View className="gap-sm">
          <Button size="lg" onPress={onNewTransaction}>
            <Text>Transaksi Baru</Text>
          </Button>

          <View className="flex-row gap-sm">
            <Button variant="ghost" className="flex-1" disabled={busy} onPress={onPrint}>
              <Text>Cetak Struk</Text>
            </Button>
            <Button
              variant="ghost"
              className="flex-1"
              disabled={busy || !canShare}
              onPress={onShare}
            >
              <Text>Bagikan</Text>
            </Button>
          </View>
        </View>
      </DialogContent>
    </Dialog>
  );
}

/** Scales in with a bounce — the one place in this product for a flourish. */
function SuccessCheck() {
  const scale = useSharedValue(0);

  React.useEffect(() => {
    scale.set(withSpring(1, { damping: 9, stiffness: 180 }));
  }, [scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Animated.View
      style={style}
      className="h-16 w-16 items-center justify-center rounded-full bg-success-subtle"
    >
      <Icon as={Check} size={32} className="text-success" />
    </Animated.View>
  );
}

function ReceiptBreakdown({ receipt }: { receipt: ReceiptData }) {
  return (
    <View className="gap-sm rounded-md bg-subtle p-md">
      <View className="gap-xs">
        <Text variant="body-strong">{receipt.merchantName}</Text>
        <Text variant="caption" tone="muted">
          {receipt.outletName}
        </Text>
        <Text variant="caption" tone="muted">
          Kasir: {receipt.cashierName}
        </Text>
        <Text variant="caption" tone="muted">
          {formatDateTime(receipt.issuedAt)}
        </Text>
      </View>

      <Separator />

      {receipt.lines.map((line, index) => (
        <View key={`${line.name}-${index}`} className="flex-row justify-between gap-md">
          <Text variant="caption" className="min-w-0 flex-1">
            {formatCount(line.quantity)} × {line.name}
          </Text>
          <Text variant="mono" className="type-caption">
            {formatIDR(line.subtotal)}
          </Text>
        </View>
      ))}

      <Separator />

      <View className="flex-row justify-between">
        <Text variant="caption" tone="muted">
          Subtotal
        </Text>
        <Text variant="mono" className="type-caption">
          {formatIDR(receipt.subtotal)}
        </Text>
      </View>
      {/* Nothing sits between Subtotal and Total. */}
      <View className="flex-row justify-between">
        <Text variant="body-strong">Total</Text>
        <Text variant="mono" className="type-body-strong">
          {formatIDR(receipt.total)}
        </Text>
      </View>
    </View>
  );
}
