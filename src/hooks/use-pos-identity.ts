/**
 * The till's identity, for the POS top bar.
 *
 * The effective outlet is a parameter, not a read from the session: a Cashier's
 * comes from the JWT, an Owner's is whichever active outlet they picked when
 * opening the till (§4.2). Passing it in keeps this hook honest about which one
 * it is showing.
 *
 * Only one of these three facts is actually available to a cashier under this
 * contract, and it is worth being precise about which:
 *
 *   • **Merchant name** — yes. `GET /merchant` is readable by every role (§2.2).
 *   • **Outlet name** — no. `GET /outlets` is OWNER and ADMIN only (§2.2) and
 *     there is no `GET /outlets/:id` at all, so a cashier has no endpoint that
 *     names the outlet they are standing in. The badge resolves empty for them
 *     and `hasOutletName` hides it; an Owner working a till still gets one.
 *   • **Operator name** — no. Login returns no user object, the JWT claims carry
 *     no name, and there is no profile endpoint (§1.2). The email the operator
 *     typed is the only identifying string the client holds.
 *
 * The printed receipt does not depend on any of this: `GET /receipts/:id`
 * carries `merchant_name`, `outlet_name` and `outlet_address` of its own (§5.4).
 */

import { useAuth } from '@/components/pages/auth/auth-provider';
import { useMerchant } from '@/hooks/use-merchant';
import { useOutlet } from '@/hooks/use-outlets';

export type PosIdentity = {
  merchantName: string;
  outletName: string;
  /** The operator's email — there is no name to show. Empty after a cold reload. */
  operatorEmail: string;
  /** True when the outlet could actually be named, so the badge can hide. */
  hasOutletName: boolean;
};

/** The outlet this till is running at; null when one has not been picked yet. */
export function usePosIdentity(outletId: string | null): PosIdentity {
  const { session } = useAuth();

  const merchant = useMerchant();
  const outlet = useOutlet(outletId ?? undefined);

  const outletName = outlet?.name ?? '';

  return {
    merchantName: merchant.data?.name ?? '',
    outletName,
    operatorEmail: session?.email ?? '',
    hasOutletName: outletName.length > 0,
  };
}
