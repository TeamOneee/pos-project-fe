/**
 * Who and where this till is — for the POS top bar and the receipt header.
 *
 * Both facts are awkward to obtain as a cashier. `GET /merchants` is Owner-only
 * in the contract, and `GET /outlets/{id}` is too, so a cashier has no
 * guaranteed way to name their own merchant or outlet. The queries are still
 * attempted, because the mock (and a more permissive backend) will answer
 * them, and everything degrades to something truthful when they do not.
 *
 * Worth a backend ticket alongside the low-stock threshold: `GET /auth/me`
 * returning the merchant name and the cashier's outlet name would settle all
 * three at once.
 */

import { useAuth } from '@/components/pages/auth/auth-provider';
import { useMerchant } from '@/hooks/use-merchant';
import { useOutlet } from '@/hooks/use-outlets';
import { can } from '@/lib/permissions';

export type PosIdentity = {
  merchantName: string;
  outletName: string;
  cashierName: string;
  /** True when the outlet could actually be named, so the badge can hide. */
  hasOutletName: boolean;
};

export function usePosIdentity(): PosIdentity {
  const { user, role, outletId } = useAuth();

  const merchant = useMerchant({ enabled: role !== null && can(role, 'merchant') });
  const outlet = useOutlet(outletId ?? undefined);

  const outletName = outlet.data?.name ?? '';

  return {
    // A receipt headed with the outlet is still correct; one headed with a
    // placeholder is not.
    merchantName: merchant.data?.name ?? outletName ?? '',
    outletName,
    cashierName: user?.name ?? '',
    hasOutletName: outletName.length > 0,
  };
}
