/** The Owner's till gate. */

import { Store } from 'lucide-react';

import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import type { Outlet } from '@/services/outlets';

export function OutletPicker({
  outlets,
  isPending,
  isError,
  onSelect,
}: {
  outlets: Outlet[];
  isPending: boolean;
  isError: boolean;
  onSelect: (outletId: string) => void;
}) {
  return (
    <div className="flex h-full items-center justify-center overflow-y-auto bg-canvas p-lg">
      <div className="w-full max-w-[520px]">
        <div className="flex flex-col items-center gap-md text-center">
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-accent-subtle">
            <Icon as={Store} size={32} className="text-accent" />
          </div>

          <div className="flex flex-col gap-xs">
            <Text variant="h2" className="block">
              Pilih outlet untuk kasir
            </Text>
            <Text variant="body" tone="muted">
              Pilih outlet tempat Anda bertugas. Catalog, harga, dan stok mengikuti pilihan ini.
            </Text>
          </div>
        </div>

        <div className="mt-lg flex flex-col gap-sm">
          {isPending ? (
            <>
              <Skeleton className="h-[72px] w-full rounded-lg" />
              <Skeleton className="h-[72px] w-full rounded-lg" />
              <Skeleton className="h-[72px] w-full rounded-lg" />
            </>
          ) : isError ? (
            <Text variant="body" tone="danger" className="block text-center">
              Gagal memuat outlet. Periksa koneksi Anda.
            </Text>
          ) : outlets.length === 0 ? (
            <Text variant="body" tone="muted" className="block text-center">
              Belum ada outlet aktif. Buat outlet terlebih dahulu.
            </Text>
          ) : (
            outlets.map((outlet) => (
              <button
                key={outlet.outletId}
                onClick={() => onSelect(outlet.outletId)}
                className="flex min-h-touch flex-col gap-xs rounded-lg border border-border-interactive bg-surface p-md text-left outline-none transition-colors hover:border-accent hover:bg-subtle focus-ring"
              >
                <Text variant="body-strong" className="block">
                  {outlet.name}
                </Text>
                {outlet.address ? (
                  <Text variant="caption" tone="muted" className="block truncate">
                    {outlet.address}
                  </Text>
                ) : null}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
