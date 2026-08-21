/** A stable colour per category name. */

import { CHART_PALETTE } from '@/lib/tokens';

/** The warning token, reserved for status. */
const AMBER = '#F59E0B';

export const CATEGORY_HUES: readonly string[] = CHART_PALETTE.filter((hue) => hue !== AMBER);

/**
 * categoryId → hue, by the list's own order. Stable across pages of a product list because it is
 * derived from the category list, never from the rows on screen — a colour that depended on which
 * products happened to be on page 2 would move as you paged.
 */
export function categoryHueIndex(
  categories: readonly { categoryId: string }[]
): Map<string, string> {
  return new Map(
    categories.map((category, index) => [
      category.categoryId,
      CATEGORY_HUES[index % CATEGORY_HUES.length] as string,
    ])
  );
}

/**
 * Case- and whitespace-insensitive, so "Minuman" and "minuman " are one category as far as colour
 * is concerned — the API does not guarantee casing.
 */
export function categoryHue(name: string): string {
  const key = name.trim().toLowerCase();
  if (!key) return CATEGORY_HUES[0] as string;

  // FNV-ish: cheap, stable, and spreads short Indonesian words evenly enough.
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (Math.imul(hash, 31) + key.charCodeAt(index)) >>> 0;
  }

  return CATEGORY_HUES[hash % CATEGORY_HUES.length] as string;
}
