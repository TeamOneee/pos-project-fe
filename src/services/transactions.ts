/**
 * Sales module — contract §5.2.
 *
 * Checkout is `POST /checkout` and it is stateless: there is no server cart to
 * build up first (§5.2 — "Cart Iterasi 1 = client-side only… tidak ada endpoint
 * REST `/cart/*`"). The whole basket is sent inline, and the server reprices
 * every line from the outlet's effective price before it commits (BR-012), so
 * the prices the client sends are never trusted for arithmetic.
 *
 * Idempotency moved from a header to the body: `checkout_request_id` is a
 * client-minted UUID, unique per `(merchant_id, checkout_request_id)`. Resending
 * the identical payload with the same id returns the sale that already exists;
 * changing the payload under a reused id is a 409 `IDEMPOTENCY_CONFLICT`.
 *
 * Cancel, void and refund do not exist — `TransactionStatus` is `COMPLETED` and
 * nothing else (§5.1).
 */

import { z } from 'zod';

import { request } from '@/api/client';
import {
  id,
  isoDateTime,
  money,
  paginated,
  paymentMethodSchema,
  paymentStatusSchema,
  roleSchema,
  transactionStatusSchema,
  type Page,
  type PaymentMethod,
} from '@/api/schema';

/* -------------------------------------------------------------------------- */
/* Schemas                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * §5.4 `PaymentInfo` — an attribute set on the transaction, not an entity.
 * There is no separate payment amount: the transaction total is the amount
 * (FR-PAY-003).
 */
const paymentSchema = z
  .object({
    method: paymentMethodSchema,
    status: paymentStatusSchema,
    paid_at: isoDateTime,
  })
  .transform((value) => ({
    method: value.method,
    status: value.status,
    paidAt: value.paid_at,
  }));

/** §5.4 `TransactionItemDto` — a snapshot, not a live join to the product. */
export const transactionItemSchema = z
  .object({
    product_id: id,
    name: z.string(),
    unit_price: money,
    quantity: z.number(),
    subtotal: money,
  })
  .transform((value) => ({
    productId: value.product_id,
    /** The product's name as it stood at the sale (BR-006). */
    name: value.name,
    /** Integer rupiah, frozen at the moment of sale. */
    unitPrice: value.unit_price,
    quantity: value.quantity,
    subtotal: value.subtotal,
  }));

export type TransactionItem = z.infer<typeof transactionItemSchema>;

/** §5.4: whoever rang the sale — a cashier, or the owner working an outlet. */
const operatorSchema = z
  .object({ user_id: id, role: roleSchema, name: z.string() })
  .transform((value) => ({ userId: value.user_id, role: value.role, name: value.name }));

/**
 * §5.4 `CheckoutResult`. One shape serves three endpoints: the checkout
 * response, `GET /transactions/:id`, and `GET /transactions/search`.
 */
export const transactionDetailSchema = z
  .object({
    transaction_id: id,
    merchant_id: id.optional(),
    transaction_number: z.string(),
    status: transactionStatusSchema,
    outlet_id: id,
    operator: operatorSchema,
    items: z.array(transactionItemSchema),
    subtotal: money,
    total: money,
    payment: paymentSchema,
    created_at: isoDateTime,
  })
  .transform((value) => ({
    transactionId: value.transaction_id,
    merchantId: value.merchant_id ?? null,
    transactionNumber: value.transaction_number,
    status: value.status,
    outletId: value.outlet_id,
    operator: value.operator,
    items: value.items,
    /** Integer rupiah. Total equals subtotal — rule 2, no discounts or tax. */
    subtotal: value.subtotal,
    total: value.total,
    payment: value.payment,
    createdAt: value.created_at,
  }));

export type TransactionDetail = z.infer<typeof transactionDetailSchema>;

/**
 * §5.4 `ReceiptDto` — the detail shape plus the three header fields a printed
 * receipt needs. Rendered from the transaction's own snapshot, so reprinting an
 * old receipt never picks up today's prices (§5.2).
 */
export const receiptSchema = z
  .object({
    transaction_id: id,
    transaction_number: z.string(),
    status: transactionStatusSchema,
    outlet_id: id,
    operator: operatorSchema,
    items: z.array(transactionItemSchema),
    subtotal: money,
    total: money,
    payment: paymentSchema,
    created_at: isoDateTime,
    merchant_name: z.string(),
    outlet_name: z.string(),
    outlet_address: z.string().nullable(),
  })
  .transform((value) => ({
    transactionId: value.transaction_id,
    transactionNumber: value.transaction_number,
    status: value.status,
    outletId: value.outlet_id,
    operator: value.operator,
    items: value.items,
    subtotal: value.subtotal,
    total: value.total,
    payment: value.payment,
    createdAt: value.created_at,
    merchantName: value.merchant_name,
    outletName: value.outlet_name,
    outletAddress: value.outlet_address,
  }));

export type Receipt = z.infer<typeof receiptSchema>;

/**
 * §5.4 `TransactionSummaryDto` — the list row.
 *
 * Note what a row does *not* carry: no line count and no payment method. The
 * history table can only show what is here; anything else needs the detail
 * endpoint.
 */
export const transactionSummarySchema = z
  .object({
    transaction_id: id,
    transaction_number: z.string(),
    outlet_id: id,
    operator_name: z.string(),
    total: money,
    status: transactionStatusSchema,
    created_at: isoDateTime,
  })
  .transform((value) => ({
    transactionId: value.transaction_id,
    transactionNumber: value.transaction_number,
    outletId: value.outlet_id,
    operatorName: value.operator_name,
    /** Integer rupiah. */
    total: value.total,
    status: value.status,
    createdAt: value.created_at,
  }));

export type TransactionSummary = z.infer<typeof transactionSummarySchema>;

/* -------------------------------------------------------------------------- */
/* Requests                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * §5.2: filters are the date range and the outlet, and that is all.
 *
 * There is no cashier filter — a CASHIER is restricted to their own sales by
 * the service itself (OD-003), and an OWNER cannot narrow by operator.
 */
export type TransactionFilters = {
  /** ISO-8601 datetime, not a plain date. */
  date_from?: string;
  date_to?: string;
  outlet_id?: string;
  page?: number;
  size?: number;
};

/** §5.4 `CheckoutItem`. */
export type CheckoutItemInput = {
  product_id: string;
  quantity: number;
  /**
   * What the cashier saw. Used only to detect drift — the server prices the
   * line from its own data either way (§5.2). Omit it to accept any price.
   */
  expected_unit_price?: string;
};

/** §5.4 `CheckoutRequest`. */
export type CheckoutInput = {
  /** Client-minted UUID. The same one must be reused across a user-visible retry. */
  checkout_request_id: string;
  outlet_id: string;
  items: CheckoutItemInput[];
  payment_method: PaymentMethod;
};

export const transactionsApi = {
  /** OWNER sees the whole merchant; CASHIER only their own sales. ADMIN gets 403. */
  list: (filters: TransactionFilters = {}): Promise<Page<TransactionSummary>> =>
    request({
      method: 'GET',
      path: '/transactions',
      query: {
        date_from: filters.date_from,
        date_to: filters.date_to,
        outlet_id: filters.outlet_id,
        page: filters.page,
        size: filters.size,
      },
      schema: paginated(transactionSummarySchema),
    }),

  get: (transactionId: string) =>
    request({
      method: 'GET',
      path: `/transactions/${transactionId}`,
      schema: transactionDetailSchema,
    }),

  /** §5.2: exact match on the transaction number, unique per merchant. */
  search: (transactionNumber: string) =>
    request({
      method: 'GET',
      path: '/transactions/search',
      query: { transaction_number: transactionNumber },
      schema: transactionDetailSchema,
    }),

  /**
   * Checkout.
   *
   * Always answers 200 — §5.2 gives the same status to a fresh sale and to an
   * idempotent replay, so there is no way to tell them apart from the response
   * alone. Callers must not claim "already processed" on their own initiative.
   */
  checkout: (input: CheckoutInput) =>
    request({
      method: 'POST',
      path: '/checkout',
      body: input,
      schema: transactionDetailSchema,
    }),

  /**
   * §5.2 `GET /transactions/status`: did a checkout land?
   *
   * This is the recovery path after a dropped connection — 200 means the sale
   * exists, 404 means it never happened and the same basket may be submitted
   * again as a new checkout (FR-CHK-003/004).
   */
  statusFor: (checkoutRequestId: string) =>
    request({
      method: 'GET',
      path: '/transactions/status',
      query: { checkout_request_id: checkoutRequestId },
      schema: transactionDetailSchema,
    }),

  receipt: (transactionId: string) =>
    request({
      method: 'GET',
      path: `/receipts/${transactionId}`,
      schema: receiptSchema,
    }),
};

/**
 * A checkout request id. §5.4 asks for a UUID, so this is a v4 built from
 * `crypto.randomUUID` where available and from `getRandomValues` otherwise.
 *
 * Deliberately not derived from the basket: two customers buying the same
 * single item are two sales, and a payload-derived id would collapse them into
 * one.
 */
export function mintCheckoutRequestId(): string {
  const globalCrypto = globalThis.crypto;
  if (typeof globalCrypto?.randomUUID === 'function') return globalCrypto.randomUUID();

  const bytes = new Uint8Array(16);
  globalCrypto.getRandomValues(bytes);

  // Set the version (4) and variant (10xx) bits the UUID spec requires.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}
