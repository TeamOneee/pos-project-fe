/**
 * The split layout behind login and register (design brief S-01).
 *
 * Accent panel on the left at desktop carrying the wordmark and tagline, form
 * column on the right. Below desktop the panel is dropped entirely rather than
 * stacked — it is decoration, and on a phone it would push the form under the
 * fold.
 */

import { Text } from '@/components/ui/text';

export function AuthSplitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-row bg-canvas">
      <div className="hidden w-[40%] flex-col justify-between bg-accent p-3xl desktop:flex">
        <Text variant="h2" tone="on-accent">
          POS
        </Text>

        <div className="flex flex-col gap-md">
          <Text variant="display" tone="on-accent">
            Jual hari ini. Pahami bisnismu besok.
          </Text>
          <Text variant="body" className="text-white/70">
            Satu aplikasi untuk kasir, stok, dan laporan seluruh outlet Anda.
          </Text>
        </div>

        <Text variant="caption" className="text-white/50">
          IndoMart Retail
        </Text>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-y-auto p-lg tablet:p-3xl">
        <div className="flex w-full max-w-[400px] flex-col gap-xl">{children}</div>
      </div>
    </div>
  );
}
