/**
 * Zod primitives shared by every domain schema.
 *
 * Two jobs happen here, both at the API boundary and nowhere else:
 *
 * 1. Money is converted from the API's decimal strings to integer rupiah
 *    (CLAUDE.md rule 1). Past this file, no part of the app ever sees
 *    "15750000.00" — it sees the integer 15750000.
 * 2. snake_case wire fields become camelCase domain types, so screens never
 *    reach into the transport's naming.
 */

import { z } from 'zod';

import { MoneyParseError, parseMoney } from '@/lib/money';

/* -------------------------------------------------------------------------- */
/* Scalars                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A money field. Accepts the contract's decimal string ("15750000.00") or a
 * plain integer, and yields integer rupiah. A fractional rupiah is a contract
 * violation and fails the parse rather than rounding silently.
 */
export const money = z
  .union([z.string(), z.number()])
  .superRefine((value, ctx) => {
    try {
      parseMoney(value);
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          error instanceof MoneyParseError
            ? `Nilai uang tidak valid: ${JSON.stringify(value)}`
            : 'Nilai uang tidak valid',
      });
    }
  })
  .transform((value) => parseMoney(value));

/** Money that the backend may omit or null out. Absent means zero. */
export const moneyOrZero = money.or(z.null()).or(z.undefined()).transform((value) => value ?? 0);

/** An identifier. Deliberately not `z.string().uuid()` — mock ids stay readable. */
export const id = z.string().min(1);

/** An ISO-8601 timestamp, kept as a string; lib/date.ts formats it for display. */
export const isoDateTime = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Format tanggal tidak valid',
});

/** A calendar date, "YYYY-MM-DD". */
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid');

/** A percentage the API sends as a float (12.5 means 12,5%). Never money. */
export const percentage = z.number();

/* -------------------------------------------------------------------------- */
/* Enums                                                                       */
/* -------------------------------------------------------------------------- */

export const roleSchema = z.enum(['OWNER', 'ADMIN', 'CASHIER']);
export type Role = z.infer<typeof roleSchema>;

export const statusSchema = z.enum(['ACTIVE', 'INACTIVE']);
export type Status = z.infer<typeof statusSchema>;

/**
 * Transaction status. The Prisma schema has no such column yet (CLAUDE.md
 * § Known backend gaps), so live responses may omit it — the client type keeps
 * it and the mock serves it. Absent is treated as COMPLETED, which is what the
 * backend implicitly means today.
 */
export const transactionStatusSchema = z.enum(['COMPLETED', 'PENDING', 'CANCELLED']);
export type TransactionStatus = z.infer<typeof transactionStatusSchema>;

/**
 * Payment method. There is no Payment model in the schema yet, same gap. This
 * is a label on a completed sale, not a gateway integration — payment
 * processing is explicitly out of scope.
 */
export const paymentMethodSchema = z.enum(['CASH', 'QRIS', 'DEBIT', 'TRANSFER']);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

/** Period selector shared by the dashboard and analytics endpoints. */
export const periodSchema = z.enum([
  'TODAY',
  'THIS_WEEK',
  'THIS_MONTH',
  'THIS_QUARTER',
  'THIS_YEAR',
]);
export type Period = z.infer<typeof periodSchema>;

export const intervalSchema = z.enum(['DAILY', 'WEEKLY', 'MONTHLY']);
export type Interval = z.infer<typeof intervalSchema>;

/* -------------------------------------------------------------------------- */
/* Gap helpers                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * A field the API contract specifies but the current backend does not send.
 * Absent or null collapses to the given fallback, so screens can rely on the
 * field existing while the backend catches up.
 */
export function gapField<T extends z.ZodTypeAny>(schema: T, fallback: z.infer<T>) {
  return schema
    .or(z.null())
    .or(z.undefined())
    .transform((value) => (value ?? fallback) as z.infer<T>);
}

/* -------------------------------------------------------------------------- */
/* Envelopes                                                                   */
/* -------------------------------------------------------------------------- */

/** Contract §2: every successful response is wrapped in this envelope. */
export function successEnvelope<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    success: z.literal(true),
    statusCode: z.number(),
    message: z.string(),
    data,
  });
}

/** Contract §2: the paginated `data` block. */
export function paginated<T extends z.ZodTypeAny>(item: T) {
  return z
    .object({
      items: z.array(item),
      total: z.number(),
      page: z.number(),
      limit: z.number(),
      total_pages: z.number(),
    })
    .transform((value) => ({
      items: value.items,
      total: value.total,
      page: value.page,
      limit: value.limit,
      totalPages: value.total_pages,
    }));
}

/** A page of results, after the transform above. */
export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

/** Endpoints whose `data` is null (logout, every soft delete). */
export const noData = z
  .union([z.null(), z.undefined(), z.object({}).passthrough()])
  .transform(() => null);
