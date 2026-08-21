/** The three badges the catalog screens share. */

import { EyeOff, TriangleAlert } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { categoryHue } from '@/lib/category-color';
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

/** The catalog spelling of the same thing. */
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

/** The product's category: a neutral pill, marked with the category's own hue. */
export function CategoryBadge({ name, hue }: { name: string | null; hue?: string | undefined }) {
  if (!name) {
    return (
      <Text variant="caption" tone="subtle">
        Tanpa kategori
      </Text>
    );
  }

  return (
    <Badge variant="neutral">
      <span
        aria-hidden
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: hue ?? categoryHue(name) }}
      />
      <Text>{name}</Text>
    </Badge>
  );
}

/** A deactivated product that still holds stock, as the stock queue sees it. */
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
 * An active product whose category has been deactivated. It is deliberately not auto-deactivated
 * and not filtered out of this list — the Admin has to be able to find it and fix it, which they
 * cannot do if it silently disappears.
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
