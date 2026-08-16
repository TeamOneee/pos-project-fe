/**
 * The two states the dashboard has besides "populated".
 *
 * The skeleton mirrors the real layout rather than being a generic block, so
 * nothing jumps when the data lands.
 *
 * The empty state keeps the KPI tiles — at Rp 0 and 0 — because a new merchant
 * needs to see that the figures exist and are simply zero, not that the screen
 * is broken. Rows 2 to 6 collapse into one card pointing at outlet setup.
 */

import { ChartColumn } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';

export function DashboardEmpty() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-md py-3xl">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-subtle">
          <Icon as={ChartColumn} size={28} className="text-fg-subtle" />
        </div>

        <Text variant="h2" className="text-center">
          Belum ada data penjualan
        </Text>
        <Text variant="body" tone="muted" className="max-w-[420px] text-center">
          Data dashboard akan muncul setelah kasir menyelesaikan transaksi pertama.
        </Text>

        <Link
          to="/outlets"
          className="inline-flex min-h-touch items-center justify-center gap-sm rounded-md bg-accent px-lg py-md outline-none transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Text variant="body-strong" className="text-white">
            Kelola Outlet
          </Text>
        </Link>
      </CardContent>
    </Card>
  );
}

export function DashboardSkeleton({ chartHeight }: { chartHeight: number }) {
  return (
    <div className="flex flex-col gap-lg">
      {/* Row 1 — four tiles, 2×2 on mobile. */}
      <div className="flex flex-row flex-wrap gap-lg">
        {[0, 1, 2, 3].map((index) => (
          <Card key={index} className="min-w-[140px] flex-1 basis-[calc(50%-8px)] tablet:basis-0">
            <CardContent className="flex flex-col gap-sm pt-lg">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 2 — chart beside summary. */}
      <div className="flex flex-col gap-lg desktop:flex-row">
        <ChartSkeleton height={chartHeight} className="desktop:w-[66%]" />
        <Card className="desktop:flex-1">
          <CardContent className="flex flex-col gap-md pt-lg">
            <Skeleton className="h-6 w-40" />
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-4 w-full" />
            ))}
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>

      {/* Row 3 — outlets beside hours. */}
      <div className="flex flex-col gap-lg desktop:flex-row">
        <Card className="desktop:w-[58%]">
          <CardContent className="flex flex-col gap-lg pt-lg">
            {[0, 1, 2].map((index) => (
              <div key={index} className="flex flex-col gap-sm">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </CardContent>
        </Card>
        <ChartSkeleton height={chartHeight} className="desktop:flex-1" />
      </div>

      {/* Rows 4 and 5 — two halves each. */}
      {[0, 1].map((row) => (
        <div key={row} className="flex flex-col gap-lg desktop:flex-row">
          <ListSkeleton className="desktop:flex-1" />
          <ListSkeleton className="desktop:flex-1" />
        </div>
      ))}

      {/* Row 6 — full-width period comparison. */}
      <Card>
        <CardContent className="flex flex-col gap-lg pt-lg desktop:flex-row">
          <Skeleton className="h-28 flex-1" />
          <Skeleton className="h-28 w-40" />
          <Skeleton className="h-28 flex-1" />
        </CardContent>
      </Card>
    </div>
  );
}

function ChartSkeleton({ height, className }: { height: number; className?: string }) {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col gap-md pt-lg">
        <Skeleton className="h-6 w-40" />
        <Skeleton style={{ height }} className="w-full" />
        <Skeleton className="h-4 w-full" />
      </CardContent>
    </Card>
  );
}

function ListSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col gap-md pt-lg">
        <Skeleton className="h-6 w-40" />
        {[0, 1, 2, 3, 4].map((index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}
