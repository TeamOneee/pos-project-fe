/** How stock reads on screen. */

export type StockLevel = 'out' | 'low' | 'ok';

/** Where a quantity sits against its own effective threshold. */
export function stockLevel(stock: number, threshold: number): StockLevel {
  if (stock <= 0) return 'out';
  // "At or below" — a product sitting exactly on the threshold is already low.
  if (stock <= threshold) return 'low';
  return 'ok';
}

/** A row of stock as the alert tables and drawer see it. */
export type StockRow = { quantity: number; effectiveLowStockThreshold: number };

/**
 * How urgent a low-stock row is: the smaller the share of its threshold that remains, the closer it
 * is to running out.
 */
export function stockUrgency(row: StockRow): number {
  if (row.effectiveLowStockThreshold <= 0) return row.quantity;
  return row.quantity / row.effectiveLowStockThreshold;
}

/** Most urgent first, with the raw count breaking ties. */
export function byUrgency<T extends StockRow>(a: T, b: T): number {
  return stockUrgency(a) - stockUrgency(b) || a.quantity - b.quantity;
}

/** Most urgent first. */
export function sortByUrgency<T extends StockRow>(rows: readonly T[]): T[] {
  return [...rows].sort(byUrgency);
}

/** The rows that have actually run out. */
export function isOutOfStock(row: { quantity: number }): boolean {
  return row.quantity <= 0;
}
