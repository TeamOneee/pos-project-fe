/**
 * The checkout flow against the mock backend.
 *
 * These go through the real domain clients and the real mock, so what is
 * verified is that each S-18 state is genuinely reachable — not that a
 * hand-written error object classifies correctly.
 */

import { z } from 'zod';

import { classifyFailure } from '@/features/checkout/checkout-machine';
import { request, setTransport } from '@/lib/api/client';
import { authApi } from '@/lib/api/domains/auth';
import { cartApi } from '@/lib/api/domains/cart';
import { inventoryApi } from '@/lib/api/domains/inventory';
import { productsApi } from '@/lib/api/domains/products';
import { transactionsApi } from '@/lib/api/domains/transactions';
import { mockTransport } from '@/lib/api/mock/adapter';
import { resetDb } from '@/lib/api/mock/db';
import { clearMockScenario, setMockScenario } from '@/lib/api/mock/scenarios';

const ADMIN = { email: 'sari@indomart.com', password: 'password123' };
const CASHIER = { email: 'budi@indomart.com', password: 'password123' };

const signIn = (credentials: { email: string; password: string }) => authApi.login(credentials);

beforeEach(() => {
  resetDb();
  clearMockScenario();
  setTransport(mockTransport);
});

afterAll(() => setTransport(null));

describe('the happy path', () => {
  it('sells a cart end to end', async () => {
    await signIn(CASHIER);

    await cartApi.addItem({ product_id: 'prd_cc1500', quantity: 2 });
    await cartApi.addItem({ product_id: 'prd_sp1500', quantity: 1 });
    const cart = await cartApi.get();

    // The brief's two-item cart: 30.000 + 15.000.
    expect(cart.subtotal).toBe(45_000);

    const result = await transactionsApi.checkout(
      { cart_id: cart.cartId, payment_method: 'CASH' },
      'chk_happy'
    );

    expect(result.isDuplicate).toBe(false);
    expect(result.transaction.total).toBe(45_000);
    expect(result.transaction.subtotal).toBe(result.transaction.total);
    expect(result.receipt?.receiptNumber).toMatch(/^RC-/);
    expect(result.items).toHaveLength(2);

    // Stock moved, cart emptied.
    const stock = await inventoryApi.getForProduct('otl_a', 'prd_cc1500');
    expect(stock.quantity).toBe(3);
    expect((await cartApi.get()).items).toHaveLength(0);
  });
});

describe('S-18a · insufficient stock is reachable', () => {
  it('rejects an order larger than the outlet holds', async () => {
    await signIn(CASHIER);

    const error = await transactionsApi
      .checkout({ items: [{ product_id: 'prd_cc1500', quantity: 50 }] })
      .catch((caught: unknown) => caught);

    const failure = classifyFailure(error);
    expect(failure.kind).toBe('insufficient_stock');

    if (failure.kind !== 'insufficient_stock') throw new Error('wrong kind');
    expect(failure.items[0]).toEqual({
      productId: 'prd_cc1500',
      productName: 'Coca Cola 1.5L',
      requested: 50,
      available: 5,
    });

    // Nothing was sold.
    const stock = await inventoryApi.getForProduct('otl_a', 'prd_cc1500');
    expect(stock.quantity).toBe(5);
  });
});

describe('S-18b · price changed is reachable', () => {
  it('rejects a cart priced before an Admin repriced the product', async () => {
    await signIn(CASHIER);
    const cart = await cartApi.addItem({ product_id: 'prd_cc1500', quantity: 2 });

    await signIn(ADMIN);
    await productsApi.update('prd_cc1500', { price: '18000.00' });

    await signIn(CASHIER);
    const error = await transactionsApi
      .checkout({ cart_id: cart.cartId })
      .catch((caught: unknown) => caught);

    const failure = classifyFailure(error);
    expect(failure.kind).toBe('price_changed');

    if (failure.kind !== 'price_changed') throw new Error('wrong kind');
    expect(failure.items[0]?.cartPrice).toBe(15_000);
    expect(failure.items[0]?.currentPrice).toBe(18_000);
  });

  it('goes through at the new prices via the items path', async () => {
    await signIn(CASHIER);
    await cartApi.addItem({ product_id: 'prd_cc1500', quantity: 2 });

    await signIn(ADMIN);
    await productsApi.update('prd_cc1500', { price: '18000.00' });

    await signIn(CASHIER);
    // "Gunakan Harga Baru" resubmits as items, which price at the server's
    // current values rather than the cart's captured ones.
    const result = await transactionsApi.checkout({
      items: [{ product_id: 'prd_cc1500', quantity: 2 }],
    });

    expect(result.transaction.total).toBe(36_000);
  });
});

describe('S-18c · unknown status is reachable', () => {
  it('classifies a timeout as unknown rather than failed', async () => {
    await signIn(CASHIER);
    setMockScenario('timeout');

    const error = await request({
      method: 'POST',
      path: '/transactions',
      body: { items: [{ product_id: 'prd_cc1500', quantity: 1 }] },
      schema: z.unknown(),
      timeoutMs: 50,
    }).catch((caught: unknown) => caught);

    const failure = classifyFailure(error);
    expect(failure.kind).toBe('unknown');
    if (failure.kind !== 'unknown') throw new Error('wrong kind');
    expect(failure.message).toBe('Koneksi terputus. Status transaksi belum diketahui.');
  });
});

describe('a double submit produces exactly one transaction', () => {
  const input = { items: [{ product_id: 'prd_cc1500', quantity: 2 }] };

  it('collapses two sequential sends of the same key', async () => {
    await signIn(CASHIER);

    const first = await transactionsApi.checkout(input, 'chk_double');
    const second = await transactionsApi.checkout(input, 'chk_double');

    expect(first.isDuplicate).toBe(false);
    expect(second.isDuplicate).toBe(true);
    expect(second.transaction.transactionId).toBe(first.transaction.transactionId);

    // Charged once, moved stock once.
    const stock = await inventoryApi.getForProduct('otl_a', 'prd_cc1500');
    expect(stock.quantity).toBe(3);

    const transactions = await transactionsApi.list({ limit: 50 });
    const matching = transactions.items.filter(
      (entry) => entry.transactionId === first.transaction.transactionId
    );
    expect(matching).toHaveLength(1);
  });

  it('collapses two concurrent sends of the same key', async () => {
    await signIn(CASHIER);

    const [first, second] = await Promise.all([
      transactionsApi.checkout(input, 'chk_race'),
      transactionsApi.checkout(input, 'chk_race'),
    ]);

    expect(second.transaction.transactionId).toBe(first.transaction.transactionId);
    expect([first.isDuplicate, second.isDuplicate].filter(Boolean)).toHaveLength(1);

    const stock = await inventoryApi.getForProduct('otl_a', 'prd_cc1500');
    expect(stock.quantity).toBe(3);
  });

  it('treats a genuinely new sale of the same items as its own transaction', async () => {
    await signIn(CASHIER);

    // Two customers buying the same thing. Different keys, so two sales — this
    // is why the key is minted per attempt rather than derived from the payload.
    const first = await transactionsApi.checkout(input, 'chk_customer_1');
    const second = await transactionsApi.checkout(input, 'chk_customer_2');

    expect(second.transaction.transactionId).not.toBe(first.transaction.transactionId);

    const stock = await inventoryApi.getForProduct('otl_a', 'prd_cc1500');
    expect(stock.quantity).toBe(1);
  });
});
