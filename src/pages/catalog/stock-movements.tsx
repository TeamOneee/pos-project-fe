/**
 * S-15d · Riwayat Stok / Stock Movement.
 *
 * Contract §4.2 `GET /inventory/movements` — paginated, filterable by
 * outlet, product, type and date range. OWNER + ADMIN only.
 * Belum ada di FE padahal BE sudah ada — layar ini menutup gap tersebut.
 */

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { PaginationFooter } from '@/components/ui/pagination-footer';
import { OutletSelect } from '@/components/pages/owner/controls';
import { useStockMovements } from '@/hooks/use-inventory';
import { useOutlets } from '@/hooks/use-outlets';
import { useProducts } from '@/hooks/use-products';
import { formatDateTime } from '@/lib/date';
import { formatCount } from '@/lib/number';
import { cn } from '@/lib/utils';
import type { MovementFilters, StockMovement } from '@/services/inventory';

const PAGE_LIMIT = 20;

type TypeFilter = 'ALL' | 'ADJUSTMENT' | 'SALE';

export default function StockMovementsPage() {
  const [outletId, setOutletId] = React.useState<string | null>(null);
  const [type, setType] = React.useState<TypeFilter>('ALL');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<StockMovement | null>(null);

  const outlets = useOutlets({ status: 'ACTIVE' });
  // For product name resolution — load first 100 products for lookup
  const products = useProducts({ page: 0, size: 100 });

  const outletOptions = React.useMemo(
    () => (outlets.data?.items ?? []).map((o) => ({ outletId: o.outletId, name: o.name })),
    [outlets.data]
  );

  const productMap = React.useMemo(() => {
    const map = new Map<string, string>();
    (products.data?.items ?? []).forEach((p) => map.set(p.productId, p.name));
    return map;
  }, [products.data]);

  const outletMap = React.useMemo(() => {
    const map = new Map<string, string>();
    (outlets.data?.items ?? []).forEach((o) => map.set(o.outletId, o.name));
    return map;
  }, [outlets.data]);

  const filters: MovementFilters = React.useMemo(
    () => ({
      ...(outletId ? { outlet_id: outletId } : {}),
      ...(type !== 'ALL' ? { type } : {}),
      ...(dateFrom ? { date_from: new Date(dateFrom).toISOString() } : {}),
      ...(dateTo ? { date_to: new Date(dateTo).toISOString() } : {}),
      page: page - 1,
      size: PAGE_LIMIT,
    }),
    [outletId, type, dateFrom, dateTo, page]
  );

  // Reset page when filter changes
  const filterKey = `${outletId ?? ''}|${type}|${dateFrom}|${dateTo}`;
  React.useEffect(() => setPage(1), [filterKey]);

  const movements = useStockMovements(filters);

  const total = movements.data?.total ?? 0;
  const items = movements.data?.items ?? [];

  return (
    <div className="flex flex-col gap-lg p-lg desktop:mx-auto desktop:w-full desktop:max-w-[1280px]">
      <div className="flex flex-col gap-xs">
        <Text variant="h1">Riwayat Stok</Text>
        <Text variant="body" tone="muted">
          Semua pergerakan stok — penyesuaian manual dan penjualan dari kasir.
        </Text>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-lg pt-lg">
          {/* Filters */}
          <div className="flex flex-col gap-md tablet:flex-row tablet:flex-wrap tablet:items-end">
            <div className="flex min-w-[200px] flex-col gap-xs">
              <Text variant="label">Outlet</Text>
              <OutletSelect outlets={outletOptions} value={outletId} onChange={setOutletId} />
            </div>

            <div className="flex min-w-[160px] flex-col gap-xs">
              <Text variant="label">Tipe</Text>
              <Select value={type} onValueChange={(v) => setType(v as TypeFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua</SelectItem>
                  <SelectItem value="ADJUSTMENT">Penyesuaian</SelectItem>
                  <SelectItem value="SALE">Penjualan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-xs">
              <Text variant="label">Dari</Text>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>

            <div className="flex flex-col gap-xs">
              <Text variant="label">Sampai</Text>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>

            <Button
              variant="ghost"
              onClick={() => {
                setOutletId(null);
                setType('ALL');
                setDateFrom('');
                setDateTo('');
              }}
            >
              <Text>Reset</Text>
            </Button>
          </div>

          {/* Content */}
          {movements.isPending ? (
            <div className="flex flex-col gap-md">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : movements.isError ? (
            <div className="flex items-center justify-center py-3xl">
              <Text variant="body" tone="danger">
                Gagal memuat riwayat stok.
              </Text>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-md py-3xl">
              <Text variant="body" tone="muted">
                Belum ada pergerakan stok untuk filter ini.
              </Text>
              <Button
                variant="ghost"
                onClick={() => {
                  setOutletId(null);
                  setType('ALL');
                  setDateFrom('');
                  setDateTo('');
                }}
              >
                <Text>Hapus filter</Text>
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto tablet:block">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-md py-sm">
                        <Text variant="label" tone="muted">
                          Waktu
                        </Text>
                      </th>
                      <th className="px-md py-sm">
                        <Text variant="label" tone="muted">
                          Produk
                        </Text>
                      </th>
                      <th className="px-md py-sm">
                        <Text variant="label" tone="muted">
                          Outlet
                        </Text>
                      </th>
                      <th className="px-md py-sm">
                        <Text variant="label" tone="muted">
                          Tipe
                        </Text>
                      </th>
                      <th className="px-md py-sm text-right">
                        <Text variant="label" tone="muted">
                          Delta
                        </Text>
                      </th>
                      <th className="px-md py-sm text-center">
                        <Text variant="label" tone="muted">
                          Stok
                        </Text>
                      </th>
                      <th className="px-md py-sm">
                        <Text variant="label" tone="muted">
                          Alasan / Transaksi
                        </Text>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((m) => (
                      <tr
                        key={m.movementId}
                        onClick={() => setSelected(m)}
                        className="cursor-pointer border-b border-border last:border-0 hover:bg-subtle"
                      >
                        <td className="px-md py-sm whitespace-nowrap">
                          <Text variant="caption">{formatDateTime(m.createdAt)}</Text>
                        </td>
                        <td className="px-md py-sm">
                          <Text variant="body" className="truncate max-w-[180px]">
                            {productMap.get(m.productId) ?? m.productId.slice(0, 8)}
                          </Text>
                        </td>
                        <td className="px-md py-sm">
                          <Text variant="body" className="truncate max-w-[140px]">
                            {outletMap.get(m.outletId) ?? m.outletId.slice(0, 8)}
                          </Text>
                        </td>
                        <td className="px-md py-sm">
                          <Badge variant={m.type === 'ADJUSTMENT' ? 'accent' : 'info'}>
                            <Text>{m.type === 'ADJUSTMENT' ? 'Penyesuaian' : 'Penjualan'}</Text>
                          </Badge>
                        </td>
                        <td
                          className={cn(
                            'px-md py-sm text-right',
                            m.delta > 0
                              ? 'text-success-text'
                              : m.delta < 0
                                ? 'text-danger-text'
                                : 'text-fg'
                          )}
                        >
                          <Text variant="body-strong">
                            {m.delta > 0 ? `+${m.delta}` : `${m.delta}`}
                          </Text>
                        </td>
                        <td className="px-md py-sm text-center">
                          <Text variant="caption">
                            {m.quantityBefore} → {m.quantityAfter}
                          </Text>
                        </td>
                        <td className="px-md py-sm max-w-[220px]">
                          {m.type === 'ADJUSTMENT' ? (
                            <Text variant="caption" className="line-clamp-1">
                              {m.reason ?? '-'}
                            </Text>
                          ) : (
                            <Text variant="caption" tone="muted">
                              {m.transactionId ? `Trx ${m.transactionId.slice(0, 8)}` : '-'}
                            </Text>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards — whole card clickable, no extra button */}
              <div className="flex flex-col gap-md tablet:hidden">
                {items.map((m) => (
                  <Card
                    key={m.movementId}
                    className="cursor-pointer transition-colors hover:border-accent/30 py-5"
                    onClick={() => setSelected(m)}
                  >
                    <CardContent className="flex flex-col gap-sm p-md">
                      <div className="flex items-start justify-between gap-md">
                        <div className="flex flex-col gap-xs">
                          <Text variant="body-strong" className="truncate">
                            {productMap.get(m.productId) ?? m.productId.slice(0, 8)}
                          </Text>
                          <Text variant="caption" tone="muted">
                            {outletMap.get(m.outletId) ?? m.outletId.slice(0, 8)} ·{' '}
                            {formatDateTime(m.createdAt)}
                          </Text>
                        </div>
                        <Badge variant={m.type === 'ADJUSTMENT' ? 'accent' : 'info'}>
                          <Text>{m.type === 'ADJUSTMENT' ? 'Adj' : 'Sale'}</Text>
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <Text variant="caption">
                          {m.quantityBefore} → {m.quantityAfter}
                        </Text>
                        <Text
                          variant="h3"
                          className={cn(
                            m.delta > 0
                              ? 'text-success-text'
                              : m.delta < 0
                                ? 'text-danger-text'
                                : ''
                          )}
                        >
                          {m.delta > 0 ? `+${m.delta}` : `${m.delta}`}
                        </Text>
                      </div>
                      <Text variant="caption" tone="muted" className="line-clamp-1">
                        {m.type === 'ADJUSTMENT'
                          ? (m.reason ?? '-')
                          : m.transactionId
                            ? `Transaksi ${m.transactionId.slice(0, 8)}`
                            : '-'}
                      </Text>
                      <Text variant="caption" tone="subtle">
                        Tap untuk detail
                      </Text>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <PaginationFooter
                page={page}
                limit={movements.data?.size ?? PAGE_LIMIT}
                total={total}
                shown={items.length}
                totalPages={movements.data?.totalPages ?? 1}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail — single dialog, no extra columns/buttons. Row/card click opens full detail */}
      <StockMovementDetailDialog
        movement={selected}
        productName={selected ? (productMap.get(selected.productId) ?? null) : null}
        outletName={selected ? (outletMap.get(selected.outletId) ?? null) : null}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}

function StockMovementDetailDialog({
  movement,
  productName,
  outletName,
  open,
  onOpenChange,
}: {
  movement: StockMovement | null;
  productName: string | null;
  outletName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!movement) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Detail Pergerakan</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-7 py-5">
          <div className="flex items-center gap-sm">
            <Badge variant={movement.type === 'ADJUSTMENT' ? 'accent' : 'info'}>
              <Text>{movement.type === 'ADJUSTMENT' ? 'Penyesuaian' : 'Penjualan'}</Text>
            </Badge>
            <Text variant="caption" tone="muted">
              {formatDateTime(movement.createdAt)}
            </Text>
            <span
              className={cn(
                'ml-auto text-sm font-semibold',
                movement.delta > 0
                  ? 'text-success-text'
                  : movement.delta < 0
                    ? 'text-danger-text'
                    : ''
              )}
            >
              {movement.delta > 0 ? `+${movement.delta}` : `${movement.delta}`}
            </span>
          </div>

          <Card className="bg-subtle border-0 pt-3">
            <CardContent className="flex flex-row items-center justify-between gap-lg px-xl py-lg">
              <div className="flex flex-1 flex-col gap-sm">
                <Text variant="caption" tone="muted">
                  Sebelum
                </Text>
                <Text variant="h2">{formatCount(movement.quantityBefore)}</Text>
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface">
                <Text variant="body" tone="muted">
                  →
                </Text>
              </div>
              <div className="flex flex-1 flex-col gap-sm text-right">
                <Text variant="caption" tone="muted">
                  Sesudah
                </Text>
                <Text variant="h2">{formatCount(movement.quantityAfter)}</Text>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-md">
            <div className="flex flex-col gap-xs">
              <Text variant="caption" tone="muted">
                Produk
              </Text>
              <Text variant="body-strong" className="break-words">
                {productName ?? movement.productId}
              </Text>
              <Text variant="caption" tone="subtle" className="break-all">
                {movement.productId}
              </Text>
            </div>
            <div className="flex flex-col gap-xs">
              <Text variant="caption" tone="muted">
                Outlet
              </Text>
              <Text variant="body-strong" className="break-words">
                {outletName ?? movement.outletId}
              </Text>
              <Text variant="caption" tone="subtle" className="break-all">
                {movement.outletId}
              </Text>
            </div>
          </div>

          <Separator />

          {movement.type === 'ADJUSTMENT' ? (
            <div className="flex flex-col gap-xs">
              <Text variant="caption" tone="muted">
                Alasan
              </Text>
              <Text
                variant="body"
                className="whitespace-pre-wrap break-words rounded-md bg-subtle p-md"
              >
                {movement.reason && movement.reason.trim().length > 0 ? movement.reason : '-'}
              </Text>
            </div>
          ) : (
            <div className="flex flex-col gap-xs">
              <Text variant="caption" tone="muted">
                Transaksi
              </Text>
              <Text variant="body" className="break-all">
                {movement.transactionId ?? '-'}
              </Text>
            </div>
          )}

          <div className="grid grid-cols-2 gap-md">
            <div className="flex flex-col gap-xs">
              <Text variant="caption" tone="muted">
                Aktor
              </Text>
              <Text variant="caption" className="break-all">
                {movement.actorUserId}
              </Text>
            </div>
            <div className="flex flex-col gap-xs">
              <Text variant="caption" tone="muted">
                ID Pergerakan
              </Text>
              <Text variant="caption" className="break-all">
                {movement.movementId}
              </Text>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
