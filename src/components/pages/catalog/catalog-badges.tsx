/**
 * The three badges the catalog screens share.
 *
 * All of them carry words. Status is never colour alone (CLAUDE.md rule 6), and
 * the deactivated-category warning is the one badge on the screen that reports a
 * consequence rather than a state, so it says what the consequence is in text
 * the tooltip only repeats — a touch user cannot hover.
 */

import { EyeOff, TriangleAlert } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Status } from '@/api/schema';

/** Why a KATEGORI NONAKTIF product still sits in this list. */
export const INACTIVE_CATEGORY_HINT =
  'Kategorinya nonaktif, jadi produk ini tidak muncul di katalog kasir. Produk sendiri tetap aktif.';

/** Why a deactivated product still sits in the stock queue. */
export const INACTIVE_PRODUCT_HINT =
  'Produk ini nonaktif, jadi tidak dijual di kasir. Stoknya tidak perlu disesuaikan.';

export function StatusBadge({ status }: { status: Status }) {
  return <ActiveBadge active={status === 'ACTIVE'} />;
}

/**
 * The catalog spelling of the same thing.
 *
 * §3.4 gives Category and Product a boolean `is_active` rather than the
 * `ACTIVE`/`INACTIVE` enum that staff, outlets and the merchant use. The badge
 * reads identically either way; only the input differs.
 */
export function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge variant="success">
      <Text>AKTIF</Text>
    </Badge>
  ) : (
    <Badge variant="neutral">
      <Text>NONAKTIF</Text>
    </Badge>
  );
}

/** The product's category. Neutral: it is a label, not a state. */
export function CategoryBadge({ name }: { name: string | null }) {
  if (!name) {
    return (
      <Text variant="caption" tone="subtle">
        Tanpa kategori
      </Text>
    );
  }

  return (
    <Badge variant="neutral">
      <Text>{name}</Text>
    </Badge>
  );
}

/**
 * A deactivated product that still holds stock, as the stock queue sees it.
 *
 * Neutral and spelled NONAKTIF so it reads as the same state the product list
 * already shows with `ActiveBadge` — the queue and the catalog must not invent
 * two vocabularies for one flag. It stays in the queue because the stock is
 * real; what it loses is the adjust action, since restocking something nobody
 * can sell is not work.
 */
export function InactiveProductBadge() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="neutral" aria-label={`Produk nonaktif. ${INACTIVE_PRODUCT_HINT}`}>
          <Icon as={EyeOff} size={12} className="text-fg-muted" />
          <Text>NONAKTIF</Text>
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-[280px]">
        <Text>{INACTIVE_PRODUCT_HINT}</Text>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * An active product whose category has been deactivated. It is deliberately not
 * auto-deactivated and not filtered out of this list — the Admin has to be able
 * to find it and fix it, which they cannot do if it silently disappears.
 */
export function InactiveCategoryBadge() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="warning" aria-label={`Kategori nonaktif. ${INACTIVE_CATEGORY_HINT}`}>
          <Icon as={TriangleAlert} size={12} className="text-warning" />
          <Text>KATEGORI NONAKTIF</Text>
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-[280px]">
        <Text>{INACTIVE_CATEGORY_HINT}</Text>
      </TooltipContent>
    </Tooltip>
  );
}
