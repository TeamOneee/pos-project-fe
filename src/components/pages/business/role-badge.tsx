/**
 * The role chip shared by the staff screen and any future screen that has to
 * say who someone is.
 *
 * S-08 specifies the trio: OWNER accent, ADMIN info, KASIR neutral. The badge
 * carries the Bahasa label rather than the code — UI copy rule 5 — and the
 * colour only reinforces the word (CLAUDE.md rule 6).
 */

import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { ROLE_LABEL, type Role } from '@/lib/permissions';

export function RoleBadge({ role }: { role: Role }) {
  const variant = role === 'OWNER' ? 'accent' : role === 'ADMIN' ? 'info' : 'neutral';

  return (
    <Badge variant={variant}>
      <Text>{ROLE_LABEL[role]}</Text>
    </Badge>
  );
}
