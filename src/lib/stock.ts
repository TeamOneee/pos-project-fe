/**
 * How stock reads on a POS tile.
 *
 * The threshold belongs to the merchant, but `GET /merchants` is Owner-only in
 * the API contract — a cashier has no endpoint that tells them what "low"
 * means for this business. Until one exists, the POS falls back to the value
 * the seeded merchant uses.
 *
 * Worth a backend ticket: either widen merchant settings to authenticated
 * users, or carry `low_stock_threshold` on the inventory payload the POS
 * already fetches.
 */

export const DEFAULT_LOW_STOCK_THRESHOLD = 10;

export type StockLevel = 'out' | 'low' | 'ok';

export function stockLevel(stock: number, threshold = DEFAULT_LOW_STOCK_THRESHOLD): StockLevel {
  if (stock <= 0) return 'out';
  // "At or below" — a product sitting exactly on the threshold is already low.
  if (stock <= threshold) return 'low';
  return 'ok';
}

/**
 * The merchant's threshold, recovered from a low-stock payload.
 *
 * The inventory screens have the same problem the POS does: they need to know
 * what "low" means, and `GET /merchants` is Owner-only. Every low-stock alert
 * carries the merchant's threshold, so when one is on hand it is the real
 * value rather than the fallback. Zero rows means nothing is low, and the
 * fallback only decides where the AMAN/MENIPIS line sits until one appears.
 */
export function thresholdFromAlerts(
  alerts: readonly { threshold: number }[] | undefined,
  fallback = DEFAULT_LOW_STOCK_THRESHOLD
): number {
  const first = alerts?.[0]?.threshold;
  return typeof first === 'number' && first > 0 ? first : fallback;
}

/**
 * How urgent a low-stock row is: the smaller the share of its threshold that
 * remains, the closer it is to running out. Sorting on this puts a product at
 * 1 of 20 above one at 9 of 10 (S-14 row 3, S-15c).
 */
export function stockUrgency(row: { currentStock: number; threshold: number }): number {
  if (row.threshold <= 0) return row.currentStock;
  return row.currentStock / row.threshold;
}

/** Most urgent first, with the raw count breaking ties. */
export function byUrgency<T extends { currentStock: number; threshold: number }>(
  a: T,
  b: T
): number {
  return stockUrgency(a) - stockUrgency(b) || a.currentStock - b.currentStock;
}
