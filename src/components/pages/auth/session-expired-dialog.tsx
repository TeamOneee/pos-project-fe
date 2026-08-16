/**
 * The expired-session modal (design brief §7.2).
 *
 * Raised by any 401 on a session that was previously working — see
 * api/unauthorized.ts. One button, no dismiss: there is nothing useful the
 * user can do on the page behind it.
 */

import { TriangleAlert } from 'lucide-react';

import { useAuth } from '@/components/pages/auth/auth-provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

export function SessionExpiredDialog() {
  const { sessionExpired, acknowledgeSessionExpired } = useAuth();

  return (
    <Dialog open={sessionExpired}>
      {/* No close affordance: acknowledging is the only way out. */}
      <DialogContent hideClose className="max-w-[400px]">
        <DialogHeader className="items-center gap-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning-subtle">
            <Icon as={TriangleAlert} size={24} className="text-warning" />
          </div>
          <DialogTitle className="text-center">Sesi Anda telah berakhir</DialogTitle>
          <DialogDescription className="text-center">
            Silakan masuk kembali untuk melanjutkan.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button className="w-full" onClick={acknowledgeSessionExpired}>
            <Text>Masuk</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
