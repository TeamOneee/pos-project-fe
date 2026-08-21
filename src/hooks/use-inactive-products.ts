/**
 * Which products are deactivated, indexed by id.
 *
 * The stock queue needs this and cannot get it from its own payload. §6.4's
 * low-stock row carries eight fields — product, outlet, quantity, thresholds —
 * and no active flag, while `/dashboard/low-stock` happily reports rows for
 * products that were retired months ago. Left alone, the Admin is told to
 * reorder something nobody is allowed to sell.
 *
 * So the status comes from a second read and is joined on the client. The
 * inactive half of a catalogue is small by nature, which is what makes one page
 * a reasonable bet — but a bet is not a guarantee, so the index says whether it
 * is complete rather than letting a caller assume it.
 */

import * as React from 'react';

import { useProducts } from '@/hooks/use-products';
import { PAGE_SIZE_MAX } from '@/api/schema';

export type InactiveProductIndex = {
  /** Product ids known to be inactive. Empty while loading. */
  ids: ReadonlySet<string>;
  /**
   * Every inactive product fit in the one page we asked for.
   *
   * False means this is a partial answer, and a caller must say so rather than
   * let an unbadged row imply the product is active.
   */
  complete: boolean;
  isPending: boolean;
};

export function useInactiveProductIds(): InactiveProductIndex {
  const query = useProducts({ is_active: false, size: PAGE_SIZE_MAX });

  return React.useMemo(() => {
    const page = query.data;

    return {
      ids: new Set((page?.items ?? []).map((product) => product.productId)),
      /*
       * Measured against what arrived, never against the echoed `size`.
       *
       * §0 caps a page at 100 and the mock clamps to it silently. A server that
       * echoes the *requested* size instead would make a clamped page look
       * complete — which is exactly how the category screen's `size: 500` goes
       * unnoticed. Comparing items to the reported total cannot be fooled that
       * way, whichever the backend does.
       */
      complete: page !== undefined && page.items.length >= page.total,
      isPending: query.isPending,
    };
  }, [query.data, query.isPending]);
}
