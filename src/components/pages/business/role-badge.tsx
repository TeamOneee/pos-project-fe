/**
 * The role chip shared by the staff screen and any future screen that has to say who someone is.
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
