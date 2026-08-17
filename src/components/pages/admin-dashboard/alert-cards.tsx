/**
 * S-14 rows 3 and 4 — the two alert cards.
 *
 * When there is nothing to report the cards stay mounted and show a compact
 * success state instead of disappearing. An Admin opening this screen needs to
 * see that stock *was checked* and is fine; a card that vanishes is
 * indistinguishable from a card that failed to load.
 */

import { AlertTriangle, CheckCircle2, PackageX } from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { LowStockTable, OutOfStockTable } from '@/components/pages/inventory/alert-tables';
import type { OutOfStockAlert } from '@/services/dashboard';
import type { LowStockAlert } from '@/services/inventory';
import { formatCount } from '@/lib/number';

export const HEALTHY_COPY = 'Semua stok dalam kondisi aman.';

export function LowStockCard({
  alerts,
  onAdjust,
  onOpenStockPerOutlet,
  anchorRef,
}: {
  alerts: LowStockAlert[];
  onAdjust?: ((alert: LowStockAlert) => void) | undefined;
  onOpenStockPerOutlet: (product: { productId: string; name: string; sku: string }) => void;
  anchorRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <Card ref={anchorRef} className="scroll-mt-lg">
      <CardHeader className="flex flex-row items-center gap-sm">
        <Icon as={AlertTriangle} size={18} className="text-warning" />
        <Text variant="h2" className="flex-1">
          Peringatan Stok Menipis
        </Text>
        {alerts.length > 0 && (
          <Badge variant="warning" aria-label={`${alerts.length} produk menipis`}>
            <Text>{formatCount(alerts.length)}</Text>
          </Badge>
        )}
      </CardHeader>

      <CardContent>
        {alerts.length === 0 ? (
          <HealthyState />
        ) : (
          <LowStockTable
            alerts={alerts}
            onAdjust={onAdjust}
            onOpenStockPerOutlet={onOpenStockPerOutlet}
          />
        )}
      </CardContent>
    </Card>
  );
}

export function OutOfStockCard({
  alerts,
  onAdjust,
  onOpenStockPerOutlet,
  anchorRef,
}: {
  alerts: OutOfStockAlert[];
  onAdjust?: ((alert: OutOfStockAlert) => void) | undefined;
  onOpenStockPerOutlet: (product: { productId: string; name: string; sku: string }) => void;
  anchorRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <Card ref={anchorRef} className="scroll-mt-lg">
      <CardHeader className="flex flex-row items-center gap-sm">
        <Icon as={PackageX} size={18} className="text-danger" />
        <Text variant="h2" className="flex-1">
          Produk Stok Habis
        </Text>
        {alerts.length > 0 && (
          <Badge variant="danger" aria-label={`${alerts.length} produk habis`}>
            <Text>{formatCount(alerts.length)}</Text>
          </Badge>
        )}
      </CardHeader>

      <CardContent>
        {alerts.length === 0 ? (
          <HealthyState />
        ) : (
          <OutOfStockTable
            alerts={alerts}
            onAdjust={onAdjust}
            onOpenStockPerOutlet={onOpenStockPerOutlet}
          />
        )}
      </CardContent>
    </Card>
  );
}

function HealthyState() {
  return (
    <div className="flex flex-row items-center gap-md rounded-md bg-success-subtle p-lg">
      <Icon as={CheckCircle2} size={20} className="text-success" />
      <Text variant="body-strong" tone="success">
        {HEALTHY_COPY}
      </Text>
    </div>
  );
}
