/** The expired-session modal (design brief §7.2). */

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
      {/*
        `tablet:` prefixed, or it loses: DialogContent's own tablet:max-w-[480px]
        sits in a later media query and would win over a bare max-w-[400px].
      */}
      <DialogContent hideClose className="tablet:max-w-[400px]">
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
