/** S-16 · Cashier POS, and the checkout flow on top of it (S-17 … S-19). */

import { Link } from 'react-router-dom';
import * as React from 'react';

import { useAuth } from '@/components/pages/auth/auth-provider';
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
import { OutletPicker } from '@/components/pages/pos/outlet-picker';
import { emptyKind, filterProducts } from '@/lib/filter-products';
import { stockMap, usePosCatalog, type PosProduct } from '@/lib/pos-catalog';
import { ProductGrid } from '@/components/pages/pos/product-grid';
import { usePosIdentity } from '@/hooks/use-pos-identity';
import { useOutlets } from '@/hooks/use-outlets';
import { Header } from '@/components/layouts/header';
import { printReceipt } from '@/lib/print-receipt';
import { receiptFromCheckout, type ReceiptData } from '@/lib/receipt-data';
import { receiptHtml } from '@/lib/receipt-html';
import { isShareAvailable, shareReceipt } from '@/lib/share-receipt';
import { selectItemCount, selectSubtotal, useCartStore } from '@/stores/cart';
import { formatTime } from '@/lib/date';
import { formatIDR } from '@/lib/money';
import { useBreakpoint } from '@/hooks/use-breakpoint';

/** Columns per breakpoint, from the spec. */
const COLUMNS = { mobile: 2, tablet: 4, desktop: 5 } as const;

export default function PosScreen() {
  const { role, outletId: sessionOutletId } = useAuth();
  const breakpoint = useBreakpoint();
  const { toast } = useToast();

  // A Cashier's outlet is fixed by the JWT; an Owner picks an active one when opening the till
  // (§4.2).
  const [ownerOutletId, setOwnerOutletId] = React.useState<string | null>(null);
  const outletId = role === 'CASHIER' ? sessionOutletId : ownerOutletId;
  const needsOutletPick = role === 'OWNER' && !ownerOutletId;

  const identity = usePosIdentity(outletId);
  const activeOutlets = useOutlets({ status: 'ACTIVE' });

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

  // §5.2: the cart is client-side only. There is no server cart to sync with, so clearing it is a
  // local action and nothing is reconciled on load.
  const clear = useCartStore((state) => state.clear);

  const checkout = useCheckout({ outletId, lines, total: subtotal });

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

  // The receipt has to be built from the cart that produced the sale, before "Transaksi Baru"
  // empties it.
  const snapshot = React.useRef({ lines, identity });
  React.useEffect(() => {
    snapshot.current = { lines, identity };
  }, [lines, identity]);

  const { status, result } = checkout.state;

  React.useEffect(() => {
    if (status !== 'success' || !result) return;

    const { identity: who } = snapshot.current;
    setReceipt(
      receiptFromCheckout({
        transaction: result,
        merchantName: who.merchantName,
        outletName: who.outletName,
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
      // The cart is about to change, so this attempt is over — a later submit gets a fresh
      // idempotency key.
      checkout.reset();
    },
    [checkout]
  );

  const acceptNewPrices = React.useCallback(() => {
    const failure = checkout.state.failure;
    if (failure?.kind !== 'price_changed') return;

    // §5.2 reports drift by position in the request we sent, so the index is resolved back through
    // the very array that was submitted.
    applyPrices(
      Object.fromEntries(
        failure.items.flatMap((item) => {
          const line = item.itemIndex === null ? undefined : lines[item.itemIndex];
          return line ? [[line.productId, item.currentPrice] as const] : [];
        })
      )
    );
    checkout.acceptNewPrices();
  }, [checkout, applyPrices, lines]);

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
   * Stable across renders: it reads the cart through getState rather than closing over it, so
   * adding an item does not invalidate every tile's press handler.
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

  // An Owner has no till until they choose which active outlet to work (§4.2).
  if (needsOutletPick) {
    return (
      <div className="flex h-full flex-col bg-canvas">
        <PosTopBar
          outletName=""
          hasOutletName={false}
          showBack={role === 'OWNER' && breakpoint !== 'mobile'}
        />
        <div className="min-h-0 flex-1">
          <OutletPicker
            outlets={activeOutlets.data?.items ?? []}
            isPending={activeOutlets.isPending}
            isError={activeOutlets.isError}
            onSelect={setOwnerOutletId}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-canvas">
      <PosTopBar
        outletName={identity.outletName}
        hasOutletName={identity.hasOutletName}
        onSwitchOutlet={role === 'OWNER' ? () => setOwnerOutletId(null) : undefined}
        showBack={role === 'OWNER' && breakpoint !== 'mobile'}
      />

      {breakpoint === 'mobile' ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* The catalogue is the only thing that scrolls. The cart bar is a
              sibling below it, so it stays pinned above the tab bar while the
              grid scrolls — and it is absent until something is in the cart. */}
          <div className="min-h-0 flex-1 overflow-y-auto">{picker}</div>
          {itemCount > 0 && (
            <MobileCartBar
              itemCount={itemCount}
              subtotal={subtotal}
              onOpen={() => setSheetOpen(true)}
            />
          )}
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
        lines={lines}
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

function PosTopBar({
  outletName,
  hasOutletName,
  onSwitchOutlet,
  showBack,
}: {
  outletName: string;
  hasOutletName: boolean;
  /** Present for an Owner, who chose this outlet and may choose another. */
  onSwitchOutlet?: () => void;
  /** Owner only, and never on mobile — there the tab bar is the way out of the till. */
  showBack?: boolean;
}) {
  const time = useClock();
  const mobile = useBreakpoint() === 'mobile';

  return (
    <Header
      className="shrink-0"
      title="Kasir"
      badge={
        hasOutletName ? (
          <Badge variant="neutral" className="min-w-0">
            <Text className="block max-w-56 truncate">{outletName}</Text>
          </Badge>
        ) : null
      }
      actions={
        <>
          {showBack && (
            <Link
              to="/dashboard"
              className="flex min-h-touch items-center justify-center rounded-md px-md text-accent outline-none transition-opacity hover:opacity-70 focus-ring"
            >
              <Text variant="body-strong">Kembali</Text>
            </Link>
          )}

          {onSwitchOutlet && (
            <button
              onClick={onSwitchOutlet}
              className="flex min-h-touch items-center justify-center rounded-md px-md text-accent outline-none transition-opacity hover:opacity-70 focus-ring"
            >
              <Text variant="body-strong">Ganti Outlet</Text>
            </button>
          )}

          <Text variant="mono" tone="muted">
            {time}
          </Text>

          {/* Only where no sidebar or rail carries it: mobile, the Cashier's single way off the till. */}
          {mobile && (
            <Link
              to="/transactions"
              className="flex min-h-touch items-center justify-center px-md text-accent outline-none transition-opacity hover:opacity-70 focus-ring"
            >
              <Text variant="body-strong">Riwayat</Text>
            </Link>
          )}
        </>
      }
    />
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
