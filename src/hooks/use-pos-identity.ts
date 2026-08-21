/** The till's identity, for the POS top bar. */

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
