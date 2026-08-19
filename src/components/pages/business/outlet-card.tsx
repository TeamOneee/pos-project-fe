/**
 * S-06's outlet card — one tile in the grid that replaces the table.
 *
 * Outlets are few, so the screen reads as cards rather than a dense table, and
 * each card carries what §2.4 actually returns: name, address, status and
 * created-at. The brief's KPI strip (Kasir · Produk · Stok) is left out because
 * it would take three extra list queries to fill and the API serves none of
 * them on the outlet row — the created date is what the row itself can say.
 */

import { Store } from 'lucide-react';

import { Icon } from '@/components/ui/icon';
import { RowMenu, type RowMenuItem } from '@/components/ui/row-menu';
import { Text } from '@/components/ui/text';
import { StatusBadge } from '@/components/pages/catalog/catalog-badges';
import type { Outlet } from '@/services/outlets';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/utils';

export function OutletCard({
  outlet,
  menu,
}: {
  outlet: Outlet;
  /** The row actions for this outlet. */
  menu: RowMenuItem[];
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-md rounded-lg border border-border bg-surface-raised p-lg',
        !outlet.address && 'gap-sm',
        outlet.status === 'INACTIVE' && 'opacity-60'
      )}
    >
      <div className="flex flex-row items-start justify-between gap-md">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-subtle">
          <Icon as={Store} size={20} className="text-fg-muted" />
        </div>
        <StatusBadge status={outlet.status} />
      </div>

      <div className="flex flex-col gap-xs">
        <Text variant="h3" className="min-w-0 truncate">
          {outlet.name}
        </Text>
        <Text variant="body" tone="muted">
          {outlet.address ?? 'Tanpa alamat'}
        </Text>
      </div>

      <div className="flex flex-row items-center justify-between gap-md border-t border-border pt-md">
        <Text variant="caption" tone="muted">
          Dibuat pada {outlet.createdAt ? formatDate(outlet.createdAt) : '—'}
        </Text>
        <RowMenu label={`Menu untuk ${outlet.name}`} items={menu} />
      </div>
    </div>
  );
}
