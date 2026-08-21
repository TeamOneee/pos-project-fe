/** Which products are deactivated, indexed by id. */

import * as React from 'react';

import { useProducts } from '@/hooks/use-products';
import { PAGE_SIZE_MAX } from '@/api/schema';

export type InactiveProductIndex = {
  /** Product ids known to be inactive. Empty while loading. */
  ids: ReadonlySet<string>;
  /** Every inactive product fit in the one page we asked for. */
  complete: boolean;
  isPending: boolean;
};

export function useInactiveProductIds(): InactiveProductIndex {
  const query = useProducts({ is_active: false, size: PAGE_SIZE_MAX });

  return React.useMemo(() => {
    const page = query.data;

    return {
      ids: new Set((page?.items ?? []).map((product) => product.productId)),
      /** Measured against what arrived, never against the echoed `size`. */
      complete: page !== undefined && page.items.length >= page.total,
      isPending: query.isPending,
    };
  }, [query.data, query.isPending]);
}
