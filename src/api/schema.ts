/** Zod primitives shared by every domain schema. */

import { z } from 'zod';

import { MoneyParseError, parseMoney, parseMoneyLenient } from '@/lib/money';

/* -------------------------------------------------------------------------- */
/* Scalars                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A money field. §0 makes every rupiah value an explicit decimal string ("15750000.00") and never a
 * JSON number; a plain integer is still accepted so fixtures stay readable.
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

/** Lenient money: same as `money` but rounds fractional rupiah (for averages). */
export const moneyLenient = z
  .union([z.string(), z.number()])
  .superRefine((value, ctx) => {
    try {
      parseMoneyLenient(value);
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
  .transform((value) => parseMoneyLenient(value));

/** Money the backend may omit or null out. Absent means zero. */
export const moneyOrZero = money
  .or(z.null())
  .or(z.undefined())
  .transform((value) => value ?? 0);

/** An identifier. Deliberately not `z.string().uuid()` — mock ids stay readable. */
export const id = z.string().min(1);

/** An ISO-8601 timestamp, kept as a string; lib/date.ts formats it for display. */
export const isoDateTime = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Format tanggal tidak valid',
});

/** A calendar date, "YYYY-MM-DD". `analysis_date` is the one field shaped this way. */
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid');

/** A percentage the API sends as a float (12.5 means 12,5%). Never money. */
export const percentage = z.number();

/* -------------------------------------------------------------------------- */
/* Enums                                                                       */
/* -------------------------------------------------------------------------- */

export const roleSchema = z.enum(['OWNER', 'ADMIN', 'CASHIER']);
export type Role = z.infer<typeof roleSchema>;

/** §1.1, §2.1: AccountStatus, shared by staff, merchant and outlet. */
export const statusSchema = z.enum(['ACTIVE', 'INACTIVE']);
export type Status = z.infer<typeof statusSchema>;

/** §5.1: TransactionStatus is `COMPLETED` and nothing else on the MVP. */
export const transactionStatusSchema = z.enum(['COMPLETED']);
export type TransactionStatus = z.infer<typeof transactionStatusSchema>;

/** §5.1 (OD-001). Three methods; there is no DEBIT and no Payment entity. */
export const paymentMethodSchema = z.enum(['CASH', 'QRIS', 'TRANSFER']);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

/** §5.4: payment status is always CONFIRMED — confirmation is manual (FR-PAY-002). */
export const paymentStatusSchema = z.enum(['CONFIRMED']);

/** §4.1: a stock movement is either a manual adjustment or the effect of a sale. */
export const movementTypeSchema = z.enum(['ADJUSTMENT', 'SALE']);
export type MovementType = z.infer<typeof movementTypeSchema>;

/** §6.2: the only two bucket widths the trend endpoints accept. */
export const bucketSchema = z.enum(['HOUR', 'DAY']);
export type Bucket = z.infer<typeof bucketSchema>;

/**
 * §6.1: a dashboard read is FRESH or STALE. STALE still arrives as HTTP 200 carrying the last
 * aggregate — the dashboard renders it with a caveat rather than treating it as an error.
 */
export const freshnessSchema = z.enum(['FRESH', 'STALE']);
export type Freshness = z.infer<typeof freshnessSchema>;

/** §7.1: the five BI insight types one analysis can produce. */
export const insightTypeSchema = z.enum([
  'SALES_TREND',
  'OUTLET_COMPARISON',
  'TOP_PRODUCTS',
  'TIME_PATTERN',
  'AOV_TREND',
]);
export type InsightType = z.infer<typeof insightTypeSchema>;

/** §7.1: a completed AiInsight row. Process state lives on the job, not here. */
export const insightStatusSchema = z.enum(['READY', 'STALE']);
export type InsightStatus = z.infer<typeof insightStatusSchema>;

/** §7.1: AiAnalysisJob state machine, which is what the screen polls. */
export const analysisJobStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'READY',
  'RETRY_SCHEDULED',
  'FAILED',
]);
export type AnalysisJobStatus = z.infer<typeof analysisJobStatusSchema>;

/* -------------------------------------------------------------------------- */
/* Dashboard metadata                                                          */
/* -------------------------------------------------------------------------- */

/** §6.4 `DashboardMeta`, carried inline by every `/dashboard/*` response rather than nested. */
export const dashboardMetaFields = {
  data_updated_at: isoDateTime,
  freshness_status: freshnessSchema,
  timezone: z.string(),
  period_start: isoDateTime.nullish(),
  period_end: isoDateTime.nullish(),
};

export type DashboardMeta = {
  dataUpdatedAt: string;
  freshness: Freshness;
  timezone: string;
  periodStart: string | null;
  periodEnd: string | null;
};

type RawDashboardMeta = {
  data_updated_at: string;
  freshness_status: Freshness;
  timezone: string;
  period_start?: string | null;
  period_end?: string | null;
};

/** Lifts the inline meta fields into one nested object for the screens. */
export function toDashboardMeta(value: RawDashboardMeta): DashboardMeta {
  return {
    dataUpdatedAt: value.data_updated_at,
    freshness: value.freshness_status,
    timezone: value.timezone,
    periodStart: value.period_start ?? null,
    periodEnd: value.period_end ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/* Envelopes                                                                   */
/* -------------------------------------------------------------------------- */

/** §0: every successful response with a body is wrapped in this envelope. */
export function successEnvelope<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    success: z.literal(true),
    statusCode: z.number(),
    message: z.string(),
    data,
  });
}

/**
 * §0: the paginated `data` block — `content`, zero-based `page`, `size`, `total_elements`,
 * `total_pages`.
 */
export function paginated<T extends z.ZodTypeAny>(item: T) {
  return z
    .object({
      content: z.array(item),
      page: z.number(),
      size: z.number(),
      total_elements: z.number(),
      total_pages: z.number(),
    })
    .transform((value) => ({
      items: value.content,
      page: value.page,
      size: value.size,
      total: value.total_elements,
      totalPages: value.total_pages,
    }));
}

/** A page of results, after the transform above. `page` is zero-based (§0). */
export type Page<T> = {
  items: T[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
};

/** §0 defaults: `size=20`, hard maximum 100. */
export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_MAX = 100;

/** Endpoints answering `204 No Content` (§3.2, §4.2 override deletes). */
export const noData = z
  .union([z.null(), z.undefined(), z.object({}).passthrough()])
  .transform(() => null);
