/**
 * Transaction module — contract §4.9.
 *
 * Checkout is idempotent. The client derives a stable key from the payload, so
 * a retried request — a flaky network, a double tap on the pay button — returns
 * the existing sale with status 200 instead of creating a second one. Callers
 * read `isDuplicate` to tell the two apart.
 *
 * Cancel/void is explicitly out of MVP scope and has no client here.
 */

import { z } from 'zod';

import { requestWithStatus, request } from '@/api/client';
import {
  gapField,
  id,
  isoDate,
  isoDateTime,
  money,
  paginated,
  paymentMethodSchema,
  transactionStatusSchema,
  type Page,
  type PaymentMethod,
} from '@/api/schema';
import { stableRequestKey } from '@/api/transport';

/**
 * Payment is a known backend gap — there is no Payment model yet. It records
 * how a completed sale was paid for; it is not a gateway integration, which is
 * out of scope.
 */
const paymentSchema = z
  .object({
    method: paymentMethodSchema,
    amount: money.optional(),
    paid_at: isoDateTime.optional(),
  })
  .transform((value) => ({
    method: value.method,
    amount: value.amount ?? 0,
    paidAt: value.paid_at ?? null,
  }));

export const transactionSchema = z
  .object({
    transaction_id: id,
    outlet_id: id.optional(),
    user_id: id.optional(),
    transaction_number: z.string(),
    // Absent from the idempotent replay payload, which echoes only the total.
    subtotal: money.optional(),
    total: money,
    status: gapField(transactionStatusSchema, 'COMPLETED'),
    created_at: isoDateTime.optional(),
    payment: paymentSchema.nullable().optional(),
    outlet: z
      .object({ outlet_id: id, name: z.string() })
      .transform((value) => ({ outletId: value.outlet_id, name: value.name }))
      .nullable()
      .optional(),
    cashier: z
      .object({ user_id: id, name: z.string() })
      .transform((value) => ({ userId: value.user_id, name: value.name }))
      .nullable()
      .optional(),
  })
  .transform((value) => ({
    transactionId: value.transaction_id,
    outletId: value.outlet_id ?? null,
    userId: value.user_id ?? null,
    transactionNumber: value.transaction_number,
    /** Integer rupiah. Total equals subtotal — rule 2, no discounts or tax. */
    subtotal: value.subtotal ?? value.total,
    total: value.total,
    status: value.status,
    createdAt: value.created_at ?? null,
    payment: value.payment ?? null,
    outlet: value.outlet ?? null,
    cashier: value.cashier ?? null,
  }));

export type Transaction = z.infer<typeof transactionSchema>;

export const transactionItemSchema = z
  .object({
    transaction_item_id: id,
    transaction_id: id.optional(),
    product_id: id,
    quantity: z.number(),
    unit_price: money,
    subtotal: money,
    product: z
      .object({ product_id: id, name: z.string(), sku: gapField(z.string(), '') })
      .transform((value) => ({
        productId: value.product_id,
        name: value.name,
        sku: value.sku,
      }))
      .nullable()
      .optional(),
  })
  .transform((value) => ({
    transactionItemId: value.transaction_item_id,
    transactionId: value.transaction_id ?? null,
    productId: value.product_id,
    quantity: value.quantity,
    /** Integer rupiah, frozen at the moment of sale. */
    unitPrice: value.unit_price,
    subtotal: value.subtotal,
    product: value.product ?? null,
  }));

export type TransactionItem = z.infer<typeof transactionItemSchema>;

const receiptSchema = z
  .object({
    receipt_number: z.string(),
    transaction_id: id.optional(),
    issued_at: isoDateTime.optional(),
  })
  .transform((value) => ({
    receiptNumber: value.receipt_number,
    transactionId: value.transaction_id ?? null,
    issuedAt: value.issued_at ?? null,
  }));

export type Receipt = z.infer<typeof receiptSchema>;

const transactionDetailSchema = z
  .object({ transaction: transactionSchema, items: z.array(transactionItemSchema) })
  .transform((value) => ({ transaction: value.transaction, items: value.items }));

export type TransactionDetail = z.infer<typeof transactionDetailSchema>;

/** A replay omits items and receipt, so both are optional here. */
const checkoutResponseSchema = z
  .object({
    transaction: transactionSchema,
    items: z.array(transactionItemSchema).optional(),
    receipt: receiptSchema.nullable().optional(),
  })
  .transform((value) => ({
    transaction: value.transaction,
    items: value.items ?? [],
    receipt: value.receipt ?? null,
  }));

export type CheckoutResult = z.infer<typeof checkoutResponseSchema> & {
  /** True when the server returned an existing sale rather than creating one. */
  isDuplicate: boolean;
};

export type TransactionFilters = {
  outlet_id?: string;
  /** YYYY-MM-DD. */
  start_date?: string;
  end_date?: string;
  cashier_id?: string;
  page?: number;
  limit?: number;
};

export type CheckoutInput =
  | { cart_id: string; payment_method?: PaymentMethod }
  | { items: { product_id: string; quantity: number }[]; payment_method?: PaymentMethod };

export const transactionsApi = {
  list: (filters: TransactionFilters = {}): Promise<Page<Transaction>> =>
    request({
      method: 'GET',
      path: '/transactions',
      query: {
        outlet_id: filters.outlet_id,
        start_date: filters.start_date,
        end_date: filters.end_date,
        cashier_id: filters.cashier_id,
        page: filters.page,
        limit: filters.limit,
      },
      schema: paginated(transactionSchema),
    }),

  get: (transactionId: string) =>
    request({
      method: 'GET',
      path: `/transactions/${transactionId}`,
      schema: transactionDetailSchema,
    }),

  /**
   * Checkout. 201 means a new sale, 200 means this exact request already went
   * through and the original is being returned.
   *
   * Pass `idempotencyKey` to keep one key across a user-visible retry; omitted,
   * it is derived from the payload, which already collapses identical requests.
   */
  checkout: async (input: CheckoutInput, idempotencyKey?: string): Promise<CheckoutResult> => {
    const result = await requestWithStatus({
      method: 'POST',
      path: '/transactions',
      body: input,
      idempotencyKey: idempotencyKey ?? stableRequestKey('/transactions', input),
      schema: checkoutResponseSchema,
    });

    return { ...result.data, isDuplicate: result.status === 200 };
  },
};

/** Re-exported so screens can validate a date filter before sending it. */
export const transactionDateSchema = isoDate;
