/**
 * S-06 · Outlet.
 *
 * The route asks for `outlets` manage, so only the Owner gets here — there is
 * no read-only variant to render, and the mutation hooks behind every
 * affordance carry the same guard. The screen is a card grid rather than a
 * table because outlets are few (brief §7.3), and it pages wide (one request,
 * size capped at the API's maximum) with search applied locally: §2.2 has a
 * status filter but no search term, so the status is server-side and the
 * search stays on the list the screen already has.
 */

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { RowMenuItem } from '@/components/ui/row-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { DeactivateDialog, HISTORY_PRESERVED } from '@/components/pages/catalog/deactivate-dialog';
import { OutletCard } from '@/components/pages/business/outlet-card';
import { OutletDialog } from '@/components/pages/business/outlet-dialog';
import {
  EMPTY_QUERY,
  isFiltered,
  OutletFilterBar,
  type OutletQuery,
} from '@/components/pages/business/outlet-filters';
import { useDeactivateOutlet, useOutlets } from '@/hooks/use-outlets';
import type { Outlet } from '@/services/outlets';
import { PAGE_SIZE_MAX } from '@/api/schema';

export default function OutletsPage() {
  const { toast } = useToast();

  const [query, setQuery] = React.useState<OutletQuery>(EMPTY_QUERY);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Outlet | null>(null);
  const [deactivating, setDeactivating] = React.useState<Outlet | null>(null);

  // §2.2 filters status server-side and has no search term, so the page asks
  // for everything and narrows locally. Outlets are few; one wide request is
  // cheaper and reads better than ten pages of three.
  const outlets = useOutlets({
    ...(query.status ? { status: query.status } : {}),
    size: PAGE_SIZE_MAX,
  });

  const deactivate = useDeactivateOutlet();

  const search = query.search.trim().toLowerCase();
  const rows = React.useMemo(
    () =>
      (outlets.data?.items ?? []).filter(
        (outlet) =>
          search === '' ||
          outlet.name.toLowerCase().includes(search) ||
          (outlet.address ?? '').toLowerCase().includes(search)
      ),
    [outlets.data, search]
  );

  const openEditor = (outlet: Outlet | null) => {
    setEditing(outlet);
    setEditorOpen(true);
  };

  const rowMenu = (outlet: Outlet): RowMenuItem[] => [
    { label: 'Edit', onSelect: () => openEditor(outlet) },
    ...(outlet.status === 'ACTIVE'
      ? [
          {
            label: 'Nonaktifkan',
            tone: 'danger' as const,
            onSelect: () => setDeactivating(outlet),
          },
        ]
      : []),
  ];

  const confirmDeactivate = () => {
    if (!deactivating) return;
    const name = deactivating.name;

    deactivate.mutate(deactivating.outletId, {
      onSuccess: () => {
        toast({
          variant: 'success',
          title: 'Outlet dinonaktifkan',
          description: `${name} tidak lagi menerima transaksi baru.`,
        });
        setDeactivating(null);
      },
    });
  };

  return (
    <div className="flex flex-col gap-lg p-lg desktop:mx-auto desktop:w-full desktop:max-w-[1280px]">
      <div className="flex flex-col gap-md tablet:flex-row tablet:items-start tablet:justify-between">
        <div className="flex flex-col gap-xs">
          <Text variant="h1">Outlet</Text>
          <Text variant="body" tone="muted">
            Kelola lokasi operasional merchant Anda.
          </Text>
        </div>

        <Button className="shrink-0" onClick={() => openEditor(null)}>
          <Text>+ Tambah Outlet</Text>
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-lg pt-lg">
          <OutletFilterBar query={query} onQueryChange={setQuery} />

          {outlets.isPending ? (
            <div className="grid grid-cols-1 gap-md tablet:grid-cols-2 desktop:grid-cols-3">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-[168px] w-full" />
              ))}
            </div>
          ) : outlets.isError ? (
            <div className="flex items-center justify-center py-3xl">
              <Text variant="body" tone="danger">
                Gagal memuat daftar outlet.
              </Text>
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              filtered={isFiltered(query)}
              onClearFilters={() => setQuery(EMPTY_QUERY)}
              onCreate={() => openEditor(null)}
            />
          ) : (
            <div className="grid grid-cols-1 gap-md tablet:grid-cols-2 desktop:grid-cols-3">
              {rows.map((outlet) => (
                <OutletCard key={outlet.outletId} outlet={outlet} menu={rowMenu(outlet)} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <OutletDialog
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) setEditing(null);
        }}
        outlet={editing}
      />

      <DeactivateDialog
        open={deactivating !== null}
        onOpenChange={(open) => {
          if (!open) setDeactivating(null);
        }}
        title={`Nonaktifkan ${deactivating?.name ?? 'outlet ini'}?`}
        preserved={`${HISTORY_PRESERVED} Stok dan data outlet tidak berubah, dan outlet bisa diaktifkan kembali dari layar ini.`}
        pending={deactivate.isPending}
        error={deactivate.error}
        onConfirm={confirmDeactivate}
      >
        <Text variant="body">
          {`Outlet ${deactivating?.name ?? 'ini'} tidak akan bisa menerima transaksi baru, dan kasirnya tidak bisa bertransaksi di sana.`}
        </Text>
      </DeactivateDialog>
    </div>
  );
}

function EmptyState({
  filtered,
  onClearFilters,
  onCreate,
}: {
  filtered: boolean;
  onClearFilters: () => void;
  onCreate: () => void;
}) {
  if (filtered) {
    return (
      <div className="flex flex-col items-center gap-md py-3xl">
        <Text variant="body" tone="muted">
          Tidak ada outlet yang cocok dengan filter ini.
        </Text>
        <Button variant="ghost" onClick={onClearFilters}>
          <Text>Hapus filter</Text>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-md py-3xl">
      <Text variant="h3">Belum ada outlet</Text>
      <Text variant="body" tone="muted">
        Tambahkan outlet pertama untuk mulai berjualan.
      </Text>
      <Button onClick={onCreate}>
        <Text>+ Tambah Outlet</Text>
      </Button>
    </div>
  );
}
