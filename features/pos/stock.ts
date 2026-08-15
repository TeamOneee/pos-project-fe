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
