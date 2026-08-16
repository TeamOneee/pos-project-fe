/**
 * S-16 · Cashier POS, and the checkout flow on top of it (S-17 … S-19).
 *
 * Chromeless at every breakpoint — no sidebar, no icon rail, no bottom tabs.
 * It is the screen the product exists for, it needs the whole viewport, and it
 * carries its own top bar. AppShell knows this route by name.
 *
 * Everything the cashier touches reads from the Zustand cart, which updates
 * synchronously. The server is caught up afterwards on a debounce — see
 * use-cart-sync.ts. Checkout is a separate machine with its own lock, in
 * use-checkout.ts.
 */

import { Link } from 'react-router-dom';
import * as React from 'react';

import { useAuth } from '@/components/pages/auth/auth-provider';
import { UserChip } from '@/components/layouts/user-chip';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { PaymentDialog } from '@/components/pages/checkout/payment-dialog';
import { SuccessDialog } from '@/components/pages/checkout/success-dialog';
import { useCheckout } from '@/hooks/use-checkout';
import { CartPanel } from '@/components/pages/pos/cart-panel';
import { CartSheet, MobileCartBar } from '@/components/pages/pos/cart-sheet';
import { CatalogHeader } from '@/components/pages/pos/catalog-header';
import { emptyKind, filterProducts } from '@/lib/filter-products';
import { stockMap, usePosCatalog, type PosProduct } from '@/lib/pos-catalog';
import { ProductGrid } from '@/components/pages/pos/product-grid';
import { DEFAULT_LOW_STOCK_THRESHOLD } from '@/lib/stock';
import { useCartSync } from '@/hooks/use-cart-sync';
import { usePosIdentity } from '@/hooks/use-pos-identity';
import { printReceipt } from '@/lib/print-receipt';
import { buildReceipt, type ReceiptData } from '@/lib/receipt-data';
import { receiptHtml } from '@/lib/receipt-html';
import { isShareAvailable, shareReceipt } from '@/lib/share-receipt';
import { selectItemCount, selectSubtotal, useCartStore } from '@/stores/cart';
import { formatTime } from '@/lib/date';
import { formatIDR } from '@/lib/money';
import { useBreakpoint } from '@/hooks/use-breakpoint';

/** Columns per breakpoint, from the spec. */
const COLUMNS = { mobile: 2, tablet: 4, desktop: 5 } as const;

export default function PosScreen() {
  const { outletId } = useAuth();
  const breakpoint = useBreakpoint();
  const { toast } = useToast();
  const identity = usePosIdentity();

  const [query, setQuery] = React.useState('');
  const [categoryId, setCategoryId] = React.useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  /** Lines checkout rejected for stock; tinted until the cashier adjusts them. */
  const [flagged, setFlagged] = React.useState<string[]>([]);
  const [receipt, setReceipt] = React.useState<ReceiptData | null>(null);

  const searchRef = React.useRef<HTMLInputElement>(null);

  const { catalog, isPending, isError } = usePosCatalog(outletId);

  const lines = useCartStore((state) => state.lines);
  const itemCount = useCartStore(selectItemCount);
  const subtotal = useCartStore(selectSubtotal);
  const addLine = useCartStore((state) => state.addLine);
  const increment = useCartStore((state) => state.increment);
  const decrement = useCartStore((state) => state.decrement);
  const removeLine = useCartStore((state) => state.removeLine);
  const applyPrices = useCartStore((state) => state.applyPrices);
  const syncAvailability = useCartStore((state) => state.syncAvailability);

  const stockByProduct = React.useMemo(() => stockMap(catalog.products), [catalog.products]);
  const { clear, cartId } = useCartSync({ enabled: true, stockByProduct });

  const checkout = useCheckout({ cartId, lines, total: subtotal });

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

  /* --- checkout ---------------------------------------------------------- */

  // The receipt has to be built from the cart that produced the sale, before
  // "Transaksi Baru" empties it.
  const snapshot = React.useRef({ lines, identity });
  React.useEffect(() => {
    snapshot.current = { lines, identity };
  }, [lines, identity]);

  const { status, result } = checkout.state;

  React.useEffect(() => {
    if (status !== 'success' || !result) return;

    const { lines: soldLines, identity: who } = snapshot.current;
    setReceipt(
      buildReceipt({
        transaction: result.transaction,
        items: result.items,
        cartLines: soldLines,
        merchantName: who.merchantName,
        outletName: who.outletName,
        cashierName: who.cashierName,
        method: checkout.state.method,
        received: checkout.state.received,
      })
    );
    setFlagged([]);
  }, [status, result, checkout.state.method, checkout.state.received]);

  const startNewTransaction = React.useCallback(() => {
    clear();
    checkout.reset();
    setReceipt(null);
    setPaymentOpen(false);
    setFlagged([]);
    // Back where the next sale starts.
    searchRef.current?.focus();
  }, [clear, checkout]);

  const adjustCart = React.useCallback(
    (productIds: string[]) => {
      setFlagged(productIds);
      setPaymentOpen(false);
      // The cart is about to change, so this attempt is over — a later submit
      // gets a fresh idempotency key.
      checkout.reset();
    },
    [checkout]
  );

  const acceptNewPrices = React.useCallback(() => {
    const failure = checkout.state.failure;
    if (failure?.kind !== 'price_changed') return;

    applyPrices(
      Object.fromEntries(failure.items.map((item) => [item.productId, item.currentPrice]))
    );
    checkout.acceptNewPrices();
  }, [checkout, applyPrices]);

  const handlePrint = React.useCallback(() => {
    if (receipt) void printReceipt(receiptHtml(receipt));
  }, [receipt]);

  const handleShare = React.useCallback(async () => {
    if (!receipt) return;

    const summary = `${receipt.merchantName} · ${receipt.transactionNumber} · ${formatIDR(receipt.total)}`;
    const outcome = await shareReceipt(receiptHtml(receipt), summary);

    if (outcome === 'unsupported') {
      toast({
        title: 'Berbagi tidak tersedia',
        description: 'Peramban ini tidak mendukung berbagi. Gunakan Cetak Struk.',
        variant: 'info',
      });
    }
  }, [receipt, toast]);

  /* --- cart -------------------------------------------------------------- */

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
      // Editing a flagged line resolves its complaint.
      setFlagged((current) => current.filter((id) => id !== product.productId));
    },
    [addLine, toast]
  );

  const openPayment = React.useCallback(() => {
    setSheetOpen(false);
    setPaymentOpen(true);
  }, []);

  const cartProps = {
    lines,
    itemCount,
    subtotal,
    onIncrement: increment,
    onDecrement: decrement,
    onRemove: removeLine,
    onClear: clear,
    onPay: openPayment,
    flaggedProductIds: flagged,
  };

  const empty = emptyKind(catalog.products.length, filtered.length);

  const picker = (
    <div className="flex min-w-0 flex-1 flex-col">
      {/* Outside the list, so it stays put while the grid scrolls. */}
      <CatalogHeader
        query={query}
        onQueryChange={setQuery}
        categories={catalog.categories}
        activeCategoryId={categoryId}
        onCategoryChange={setCategoryId}
        inputRef={searchRef}
      />

      {isPending ? (
        <GridSkeleton columns={COLUMNS[breakpoint]} />
      ) : isError ? (
        <div className="flex flex-1 items-center justify-center p-xl">
          <Text variant="body" tone="danger">
            Gagal memuat produk. Periksa koneksi Anda.
          </Text>
        </div>
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
    </div>
  );

  return (
    <div className="flex h-full flex-col bg-canvas">
      <PosTopBar outletName={identity.outletName} hasOutletName={identity.hasOutletName} />

      {breakpoint === 'mobile' ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {picker}
          <MobileCartBar
            itemCount={itemCount}
            subtotal={subtotal}
            onOpen={() => setSheetOpen(true)}
          />
          <CartSheet open={sheetOpen} onOpenChange={setSheetOpen} {...cartProps} />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-row">
          {picker}
          <div className="w-[38%] border-l border-border">
            <CartPanel {...cartProps} />
          </div>
        </div>
      )}

      <PaymentDialog
        open={paymentOpen && checkout.state.status !== 'success'}
        onClose={() => setPaymentOpen(false)}
        checkout={checkout}
        total={subtotal}
        quantities={quantities}
        onAdjustCart={adjustCart}
        onAcceptNewPrices={acceptNewPrices}
      />

      <SuccessDialog
        open={checkout.state.status === 'success'}
        receipt={receipt}
        onNewTransaction={startNewTransaction}
        onPrint={handlePrint}
        onShare={() => void handleShare()}
        canShare={isShareAvailable()}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function PosTopBar({ outletName, hasOutletName }: { outletName: string; hasOutletName: boolean }) {
  const time = useClock();

  return (
    <div className="flex h-16 shrink-0 flex-row items-center justify-between gap-md border-b border-border bg-surface px-lg">
      <div className="flex min-w-0 flex-row items-center gap-md">
        <Text variant="body-strong" className="shrink-0">
          Kasir
        </Text>
        {hasOutletName && (
          <Badge variant="neutral" className="min-w-0">
            <Text className="block max-w-56 truncate">{outletName}</Text>
          </Badge>
        )}
      </div>

      <div className="flex shrink-0 flex-row items-center gap-md">
        <Text variant="mono" tone="muted">
          {time}
        </Text>
        <Link
          to="/transactions"
          className="flex min-h-touch items-center justify-center px-md text-accent outline-none transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Text variant="body-strong">Riwayat</Text>
        </Link>
        <UserChip compact placement="below" />
      </div>
    </div>
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
    <div className="flex flex-1 flex-row flex-wrap p-sm">
      {Array.from({ length: columns * 3 }).map((_, index) => (
        <div key={index} className="p-sm" style={{ width: `${100 / columns}%` }}>
          <Skeleton className="h-[140px] w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}
