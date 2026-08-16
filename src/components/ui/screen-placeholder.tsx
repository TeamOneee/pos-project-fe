import { Construction } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

export function ScreenPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex h-full items-center justify-center p-xl">
      <Card className="w-full max-w-[420px]">
        <CardHeader className="items-center gap-md">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-subtle">
            <Icon as={Construction} size={26} className="text-fg-muted" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Halaman ini belum diimplementasikan.</CardDescription>
        </CardHeader>
        <CardContent>
          <Text variant="body" tone="muted" className="text-center">
            Sedang dalam pengerjaan pada migrasi web.
          </Text>
        </CardContent>
      </Card>
    </div>
  );
}
