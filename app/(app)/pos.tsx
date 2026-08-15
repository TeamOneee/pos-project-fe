/**
 * S-16 · Cashier POS.
 *
 * Chromeless at every breakpoint — no sidebar, no icon rail, no bottom tabs.
 * It is the screen the product exists for, it needs the whole viewport, and it
 * carries its own top bar. AppShell knows this route by name.
 *
 * The layout is two panels at tablet and desktop, and a grid with a cart sheet
 * at mobile. Tablet landscape is the primary form factor.
 *
 * Everything the cashier touches reads from the Zustand cart, which updates
 * synchronously. The server is caught up afterwards on a debounce — see
 * use-cart-sync.ts.
 */

import { Link } from 'expo-router';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/components/auth/auth-provider';
import { UserChip } from '@/components/shell/user-chip';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { CartPanel } from '@/features/pos/cart-panel';
import { CartSheet, MobileCartBar } from '@/features/pos/cart-sheet';
import { CatalogHeader } from '@/features/pos/catalog-header';
import { emptyKind, filterProducts } from '@/features/pos/filter-products';
import { stockMap, usePosCatalog, type PosProduct } from '@/features/pos/pos-catalog';
import { ProductGrid } from '@/features/pos/product-grid';
import { DEFAULT_LOW_STOCK_THRESHOLD } from '@/features/pos/stock';
import { useCartSync } from '@/features/pos/use-cart-sync';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useOutlet } from '@/hooks/use-outlets';
import { formatTime } from '@/lib/date';
import { selectItemCount, selectSubtotal, useCartStore } from '@/stores/cart';

/** Columns per breakpoint, from the spec. */
const COLUMNS = { mobile: 2, tablet: 4, desktop: 5 } as const;

export default function PosScreen() {
  const { outletId } = useAuth();
  const breakpoint = useBreakpoint();
  const { toast } = useToast();

  const [query, setQuery] = React.useState('');
  const [categoryId, setCategoryId] = React.useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const { catalog, isPending, isError } = usePosCatalog(outletId);

  const lines = useCartStore((state) => state.lines);
  const itemCount = useCartStore(selectItemCount);
  const subtotal = useCartStore(selectSubtotal);
  const addLine = useCartStore((state) => state.addLine);
  const increment = useCartStore((state) => state.increment);
  const decrement = useCartStore((state) => state.decrement);
  const removeLine = useCartStore((state) => state.removeLine);
  const syncAvailability = useCartStore((state) => state.syncAvailability);

  const stockByProduct = React.useMemo(() => stockMap(catalog.products), [catalog.products]);
  const { clear } = useCartSync({ enabled: true, stockByProduct });

  // Inventory refetches after a sale elsewhere; the ceilings follow.
  React.useEffect(() => {
    if (Object.keys(stockByProduct).length > 0) syncAvailability(stockByProduct);
  }, [stockByProduct, syncAvailability]);

  const filtered = React.useMemo(
    () => filterProducts(catalog.products, { query, categoryId }),
    [catalog.products, query, categoryId]
  );

  const quantities = React.useMemo(
    () => Object.fromEntries(lines.map((line) => [line.productId, line.quantity])),
    [lines]
  );

  /**
   * Stable across renders: it reads the cart through getState rather than
   * closing over it, so adding an item does not invalidate every tile's
   * press handler.
   */
  const handleSelect = React.useCallback(
    (product: PosProduct) => {
      if (product.stock <= 0) return;

      const current =
        useCartStore.getState().lines.find((line) => line.productId === product.productId)
          ?.quantity ?? 0;

      if (current >= product.stock) {
        toast({
          title: 'Stok tidak mencukupi',
          description: `${product.name} tersisa ${product.stock}.`,
          variant: 'warning',
        });
        return;
      }

      addLine({
        productId: product.productId,
        name: product.name,
        sku: product.sku,
        unitPrice: product.price,
        availableStock: product.stock,
      });
    },
    [addLine, toast]
  );

  const handlePay = React.useCallback(() => {
    // S-17 (payment modal) is the next slice; the cart and total it needs are
    // already correct here.
    toast({
      title: 'Pembayaran belum tersedia',
      description: 'Layar pembayaran (S-17) menyusul pada tahap berikutnya.',
      variant: 'info',
    });
  }, [toast]);

  const cartProps = {
    lines,
    itemCount,
    subtotal,
    onIncrement: increment,
    onDecrement: decrement,
    onRemove: removeLine,
    onClear: clear,
    onPay: handlePay,
  };

  const empty = emptyKind(catalog.products.length, filtered.length);

  const picker = (
    <View className="flex-1">
      {/* Outside the list, so it stays put while the grid scrolls. */}
      <CatalogHeader
        query={query}
        onQueryChange={setQuery}
        categories={catalog.categories}
        activeCategoryId={categoryId}
        onCategoryChange={setCategoryId}
      />

      {isPending ? (
        <GridSkeleton columns={COLUMNS[breakpoint]} />
      ) : isError ? (
        <View className="flex-1 items-center justify-center p-xl">
          <Text variant="body" tone="danger">
            Gagal memuat produk. Periksa koneksi Anda.
          </Text>
        </View>
      ) : (
        <ProductGrid
          products={filtered}
          columns={COLUMNS[breakpoint]}
          quantities={quantities}
          threshold={DEFAULT_LOW_STOCK_THRESHOLD}
          onSelect={handleSelect}
          emptyTitle={empty === 'no-results' ? 'Produk tidak ditemukan' : 'Belum ada produk'}
          emptyDescription={
            empty === 'no-results'
              ? 'Coba kata kunci lain atau pilih kategori "Semua".'
              : 'Hubungi Admin untuk menambahkan produk ke katalog.'
          }
        />
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top', 'bottom']}>
      <PosTopBar outletId={outletId} />

      {breakpoint === 'mobile' ? (
        <View className="flex-1">
          {picker}
          <MobileCartBar
            itemCount={itemCount}
            subtotal={subtotal}
            onOpen={() => setSheetOpen(true)}
          />
          <CartSheet open={sheetOpen} onOpenChange={setSheetOpen} {...cartProps} />
        </View>
      ) : (
        <View className="flex-1 flex-row">
          {picker}
          <View className="w-[38%] border-l border-border">
            <CartPanel {...cartProps} />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

/* -------------------------------------------------------------------------- */

function PosTopBar({ outletId }: { outletId: string | null }) {
  // The cashier needs their outlet's name here. The contract scopes
  // GET /outlets/{id} to the Owner, so this can fail against a real backend —
  // the badge simply does not render when it does. Worth a backend ticket: a
  // cashier has no endpoint that reliably names their own outlet.
  const outlet = useOutlet(outletId ?? undefined);
  const time = useClock();

  return (
    <View className="h-16 flex-row items-center justify-between gap-md border-b border-border bg-surface px-lg">
      <View className="min-w-0 flex-row items-center gap-md">
        <Text variant="body-strong" numberOfLines={1}>
          Kasir
        </Text>
        {outlet.data && (
          <Badge variant="neutral">
            <Text numberOfLines={1}>{outlet.data.name}</Text>
          </Badge>
        )}
      </View>

      <View className="flex-row items-center gap-md">
        <Text variant="mono" tone="muted">
          {time}
        </Text>
        <Link href="/transactions" asChild>
          <Pressable role="link" className="min-h-touch justify-center px-md active:opacity-70">
            <Text variant="body-strong" tone="accent">
              Riwayat
            </Text>
          </Pressable>
        </Link>
        <UserChip compact placement="below" />
      </View>
    </View>
  );
}

/** Wall clock, to the minute. A POS that shows a stale time is worse than none. */
function useClock(): string {
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  return formatTime(now);
}

function GridSkeleton({ columns }: { columns: number }) {
  return (
    <View className="flex-1 flex-row flex-wrap p-sm">
      {Array.from({ length: columns * 3 }).map((_, index) => (
        <View key={index} className="p-sm" style={{ width: `${100 / columns}%` }}>
          <Skeleton className="h-[140px] w-full rounded-lg" />
        </View>
      ))}
    </View>
  );
}
