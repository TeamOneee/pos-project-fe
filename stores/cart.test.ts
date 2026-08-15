/**
 * Cart arithmetic. Every figure the cashier sees comes from here, so the
 * tests are about the rupiah being exactly right rather than approximately.
 */

import {
  selectItemCount,
  selectQuantityOf,
  selectSubtotal,
  useCartStore,
  type CartLine,
} from '@/stores/cart';

const COLA = {
  productId: 'prd_cc1500',
  name: 'Coca Cola 1.5L',
  sku: 'CC-1500',
  unitPrice: 15_000,
  availableStock: 5,
};

const CHITATO = {
  productId: 'prd_ch068',
  name: 'Chitato Sapi Panggang',
  sku: 'CH-068',
  unitPrice: 12_500,
  availableStock: 30,
};

const OREO = {
  productId: 'prd_or133',
  name: 'Oreo Original 133g',
  sku: 'OR-133',
  unitPrice: 10_000,
  availableStock: 18,
};

const store = () => useCartStore.getState();
const subtotal = () => selectSubtotal(useCartStore.getState());
const itemCount = () => selectItemCount(useCartStore.getState());

beforeEach(() => useCartStore.getState().clear());

describe('totals stay exact', () => {
  it('reproduces the sample cart from the design brief', () => {
    store().addLine(COLA, 2);
    store().addLine(CHITATO, 1);
    store().addLine(OREO, 1);

    // 30.000 + 12.500 + 10.000
    expect(subtotal()).toBe(52_500);
    expect(itemCount()).toBe(4);
  });

  it('reproduces the two-item cart the flows quote', () => {
    store().addLine(COLA, 2);
    store().addLine({ ...CHITATO, productId: 'prd_sp1500', unitPrice: 15_000 }, 1);

    expect(subtotal()).toBe(45_000);
  });

  it('stays an integer through every operation', () => {
    store().addLine(CHITATO, 3);
    store().increment(CHITATO.productId);
    store().decrement(CHITATO.productId);
    store().addLine(OREO, 1);
    store().removeLine(OREO.productId);

    expect(subtotal()).toBe(37_500);
    expect(Number.isInteger(subtotal())).toBe(true);
  });

  it('adds, increments and removes without drift', () => {
    store().addLine(COLA, 1);
    expect(subtotal()).toBe(15_000);

    store().increment(COLA.productId);
    expect(subtotal()).toBe(30_000);

    store().addLine(OREO, 2);
    expect(subtotal()).toBe(50_000);

    store().decrement(OREO.productId);
    expect(subtotal()).toBe(40_000);

    store().removeLine(COLA.productId);
    expect(subtotal()).toBe(10_000);

    store().clear();
    expect(subtotal()).toBe(0);
    expect(itemCount()).toBe(0);
  });

  it('counts units, not lines', () => {
    store().addLine(COLA, 2);
    store().addLine(OREO, 1);

    expect(itemCount()).toBe(3);
    expect(useCartStore.getState().lines).toHaveLength(2);
  });
});

describe('stock ceilings', () => {
  it('will not add beyond what the outlet holds', () => {
    store().addLine(COLA, 99);

    expect(selectQuantityOf(useCartStore.getState(), COLA.productId)).toBe(5);
    expect(subtotal()).toBe(75_000);
  });

  it('stops incrementing at the ceiling', () => {
    store().addLine(COLA, 5);
    store().increment(COLA.productId);
    store().increment(COLA.productId);

    expect(selectQuantityOf(useCartStore.getState(), COLA.productId)).toBe(5);
  });

  it('merges a repeated add into the existing line', () => {
    store().addLine(CHITATO, 1);
    store().addLine(CHITATO, 2);

    expect(useCartStore.getState().lines).toHaveLength(1);
    expect(selectQuantityOf(useCartStore.getState(), CHITATO.productId)).toBe(3);
  });

  it('drops a line decremented to zero', () => {
    store().addLine(OREO, 1);
    store().decrement(OREO.productId);

    expect(useCartStore.getState().lines).toHaveLength(0);
    expect(subtotal()).toBe(0);
  });
});

describe('hydration and availability', () => {
  it('seeds from the server cart', () => {
    const lines: CartLine[] = [{ ...COLA, quantity: 2 }, { ...OREO, quantity: 1 }];
    store().hydrate(lines);

    expect(subtotal()).toBe(40_000);
    expect(itemCount()).toBe(3);
  });

  it('trims a line when stock fell below it', () => {
    store().addLine(CHITATO, 10);
    store().syncAvailability({ [CHITATO.productId]: 4 });

    expect(selectQuantityOf(useCartStore.getState(), CHITATO.productId)).toBe(4);
    expect(subtotal()).toBe(50_000);
  });

  it('drops a line whose product sold out elsewhere', () => {
    store().addLine(COLA, 2);
    store().syncAvailability({ [COLA.productId]: 0 });

    expect(useCartStore.getState().lines).toHaveLength(0);
  });

  it('leaves quantities alone when stock is unchanged or higher', () => {
    store().addLine(COLA, 2);
    store().syncAvailability({ [COLA.productId]: 40 });

    expect(selectQuantityOf(useCartStore.getState(), COLA.productId)).toBe(2);
    // The ceiling moved, so the cashier can now go past the old one.
    store().addLine(COLA, 10);
    expect(selectQuantityOf(useCartStore.getState(), COLA.productId)).toBe(12);
  });
});
