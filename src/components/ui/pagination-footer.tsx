/** The paging footer for a paginated list — products (S-11) and transactions (S-21). */

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { formatCount } from '@/lib/number';

/** "Menampilkan 1–10 dari 156", or the empty-list wording. */
export function showingLabel({
  page,
  limit,
  total,
  shown,
}: {
  page: number;
  limit: number;
  total: number;
  /** Rows on this page — the last page is usually short. */
  shown: number;
}): string {
  if (total === 0 || shown === 0) return `Menampilkan 0 dari ${formatCount(total)}`;

  const first = (page - 1) * limit + 1;
  const last = first + shown - 1;

  return `Menampilkan ${formatCount(first)}–${formatCount(last)} dari ${formatCount(total)}`;
}

export function PaginationFooter({
  page,
  limit,
  total,
  shown,
  totalPages,
  onPageChange,
}: {
  page: number;
  limit: number;
  total: number;
  shown: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-col gap-md border-t border-border pt-md tablet:flex-row tablet:items-center tablet:justify-between">
      <Text variant="caption" tone="muted">
        {showingLabel({ page, limit, total, shown })}
      </Text>

      {totalPages > 1 && (
        <div className="flex flex-row items-center gap-sm">
          <Button
            variant="outline"
            size="sm"
            aria-label="Halaman sebelumnya"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <Icon as={ChevronLeft} size={16} className="text-fg" />
            <Text>Sebelumnya</Text>
          </Button>

          <Text variant="caption" tone="muted">
            {`Halaman ${formatCount(page)} dari ${formatCount(totalPages)}`}
          </Text>

          <Button
            variant="outline"
            size="sm"
            aria-label="Halaman berikutnya"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <Text>Berikutnya</Text>
            <Icon as={ChevronRight} size={16} className="text-fg" />
          </Button>
        </div>
      )}
    </div>
  );
}
