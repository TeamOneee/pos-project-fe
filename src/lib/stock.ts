/**
 * How stock reads on screen.
 *
 * The guesswork this file used to carry is gone. There is no merchant-level
 * threshold in this contract — §0 says so in as many words — and every payload
 * that reports stock now also reports the threshold it was judged against:
 * `effective_low_stock_threshold`, resolved server-side from the outlet
 * override or the product's base value (§4.1 rule 5).
 *
 * So nothing here invents a threshold or recovers one from a sample row. The
 * caller passes the threshold the server used, and these functions only decide
 * how to say it.
 */

export type StockLevel = 'out' | 'low' | 'ok';

/**
 * Where a quantity sits against its own effective threshold.
 *
 * Prefer the server's `is_low_stock` where a payload carries one — this exists
 * for the rows that do not, and for the POS tile, whose ceiling is the outlet's
 * stock rather than a threshold.
 */
export function stockLevel(stock: number, threshold: number): StockLevel {
  if (stock <= 0) return 'out';
  // "At or below" — a product sitting exactly on the threshold is already low.
  if (stock <= threshold) return 'low';
  return 'ok';
}

/** A row of stock as the alert tables and drawer see it. */
export type StockRow = { quantity: number; effectiveLowStockThreshold: number };

/**
 * How urgent a low-stock row is: the smaller the share of its threshold that
 * remains, the closer it is to running out. Sorting on this puts a product at
 * 1 of 20 above one at 9 of 10 (S-14 row 3, S-15c).
 */
export function stockUrgency(row: StockRow): number {
  if (row.effectiveLowStockThreshold <= 0) return row.quantity;
  return row.quantity / row.effectiveLowStockThreshold;
}

/** Most urgent first, with the raw count breaking ties. */
export function byUrgency<T extends StockRow>(a: T, b: T): number {
  return stockUrgency(a) - stockUrgency(b) || a.quantity - b.quantity;
}

/** The rows that have actually run out, which get their own table (S-14 row 4). */
export function isOutOfStock(row: { quantity: number }): boolean {
  return row.quantity <= 0;
}
