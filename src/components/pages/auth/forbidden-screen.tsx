/**
 * The 403 screen (design brief §7.2).
 *
 * A full page, not a toast or an empty table: the user asked for a route they
 * cannot have, and the honest answer is a dead end with a way back.
 */

import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { landingRoute, ROLE_LABEL, type Role } from '@/lib/permissions';

export function ForbiddenScreen({ role }: { role: Role }) {
  const navigate = useNavigate();

  return (
    <div className="flex h-full items-center justify-center bg-canvas p-xl">
      <div className="flex w-full max-w-[400px] flex-col items-center gap-lg">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-danger-subtle">
          <Icon as={Lock} size={28} className="text-danger" />
        </div>

        <div className="flex flex-col gap-xs">
          <Text variant="h1" className="text-center">
            Akses ditolak
          </Text>
          <Text variant="body" tone="muted" className="text-center">
            Anda tidak memiliki akses ke halaman ini.
          </Text>
        </div>

        {/* Naming the role makes it obvious this is a permission boundary
            rather than a broken link. */}
        <Text variant="caption" tone="subtle" className="text-center">
          Anda masuk sebagai {ROLE_LABEL[role]}.
        </Text>

        <Button className="w-full" onClick={() => navigate(landingRoute(role))}>
          <Text>Kembali ke halaman utama</Text>
        </Button>
      </div>
    </div>
  );
}
