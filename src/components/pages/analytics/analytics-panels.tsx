/**
 * S-04 · Analitik — the four deep-dive panels.
 *
 * There is no `/analytics/*` module in this contract. Every panel here reads
 * the same reporting endpoints the Owner dashboard does (§6.2); the difference
 * is the controls — an explicit date range, an outlet selector and a bucket
 * width — rather than a different data source. That also means the two screens
 * can no longer disagree about a figure.
 *
 * What each panel lost, and why:
 *
 *   • **Sales & AOV** — the endpoints send `points[]` and no summary block, so
 *     the tiles underneath are computed from the points on screen.
 *   • **Interval** collapses from three options to two. §6.2 accepts `HOUR` or
 *     `DAY` and nothing else, so "Mingguan" and "Bulanan" are gone rather than
 *     silently sent and ignored.
 *   • **Product performance** is `GET /dashboard/top-products`, which ranks by
 *     omzet and units and carries neither SKU, category, stock, nor days since
 *     last sale. Those columns are gone; the top/least split the endpoint
 *     already returns is what the panel shows instead.
 */

import { Download } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { SummaryTiles } from '@/components/pages/analytics/summary-tiles';
import { AovLineChart } from '@/components/pages/charts/aov-line-chart';
import { ChartFigure, type ChartSeries } from '@/components/pages/charts/chart-figure';
import { CHART_HEIGHT, ChartFrame } from '@/components/pages/charts/chart-frame';
import { HourlyBarChart } from '@/components/pages/charts/hourly-bar-chart';
import { ProductPerformanceChart } from '@/components/pages/charts/product-performance-chart';
import { SalesTrendChart } from '@/components/pages/charts/sales-trend-chart';
import { bucketLabel } from '@/components/pages/dashboard/sales-trend-card';
import { OutletSelect, Segmented } from '@/components/pages/owner/controls';
import { DataTable, type Column } from '@/components/pages/owner/data-table';
import { useAovTrend, useSalesTrend, useTimePattern, useTopProducts } from '@/hooks/use-dashboard';
import type {
  AovTrendPoint,
  ProductRank,
  SalesTrendPoint,
  TimePatternPoint,
} from '@/services/dashboard';
import type { Outlet } from '@/services/outlets';
import type { Bucket } from '@/api/schema';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { formatIDR, sumRupiah } from '@/lib/money';
import { formatCount, formatPercent } from '@/lib/number';
import { MAX_RANGE_DAYS } from '@/lib/period';

type CommonProps = { outlets: Outlet[] };

/** §6.2: the only two bucket widths any trend endpoint accepts. */
const BUCKETS = ['DAY', 'HOUR'] as const satisfies readonly Bucket[];
const BUCKET_LABELS: Record<Bucket, string> = { DAY: 'Harian', HOUR: 'Per Jam' };

/* -------------------------------------------------------------------------- */
/* Shared range control                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The date range every panel takes, held as `YYYY-MM-DD` for the two inputs and
 * widened to the inclusive ISO instants §6.2 wants on the way out.
 */
function useDateRange() {
  const initial = React.useMemo(() => defaultMonthRange(), []);
  const [startDate, setStartDate] = React.useState(initial.start);
  const [endDate, setEndDate] = React.useState(initial.end);

  const range = React.useMemo(
    () => ({ date_from: `${startDate}T00:00:00`, date_to: `${endDate}T23:59:59` }),
    [startDate, endDate]
  );

  /** §6.2 caps an inclusive range at 366 days; say so before the server 400s. */
  const tooWide = React.useMemo(() => {
    const days = (Date.parse(endDate) - Date.parse(startDate)) / 86_400_000 + 1;
    return Number.isFinite(days) && days > MAX_RANGE_DAYS;
  }, [startDate, endDate]);

  return { startDate, setStartDate, endDate, setEndDate, range, tooWide };
}

function RangeControls({
  range,
  outlets,
  outletId,
  onOutletChange,
  children,
}: {
  range: ReturnType<typeof useDateRange>;
  outlets: Outlet[];
  outletId: string | null;
  onOutletChange: (outletId: string | null) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-sm">
      <div className="flex flex-row flex-wrap items-end gap-md">
        <DateField label="Dari" value={range.startDate} onChange={range.setStartDate} />
        <DateField label="Sampai" value={range.endDate} onChange={range.setEndDate} />
        <OutletSelect outlets={outlets} value={outletId} onChange={onOutletChange} />
        {children}
      </div>

      {range.tooWide && (
        <Text variant="caption" tone="danger">
          {`Rentang maksimal ${MAX_RANGE_DAYS} hari.`}
        </Text>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sales trend                                                                 */
/* -------------------------------------------------------------------------- */

export function SalesTrendPanel({ outlets }: CommonProps) {
  const mobile = useBreakpoint() === 'mobile';
  const range = useDateRange();
  const [outletId, setOutletId] = React.useState<string | null>(null);
  const [bucket, setBucket] = React.useState<Bucket>('DAY');

  const query = useSalesTrend(
    { ...range.range, bucket, ...(outletId ? { outlet_id: outletId } : {}) },
    { enabled: !range.tooWide }
  );

  const controls = (
    <RangeControls range={range} outlets={outlets} outletId={outletId} onOutletChange={setOutletId}>
      <Segmented
        options={BUCKETS}
        value={bucket}
        onChange={setBucket}
        labels={BUCKET_LABELS}
        accessibilityLabel="Pilih interval"
      />
    </RangeControls>
  );

  return (
    <AnalyticsState query={query} controls={controls}>
      {(data) => {
        const labels = data.points.map((point) => bucketLabel(point.bucketStart, data.bucket));
        const revenues = data.points.map((point) => point.omzet);
        const total = sumRupiah(revenues);
        const transactions = data.points.reduce((sum, point) => sum + point.transactionCount, 0);

        return (
          <div className="flex flex-col gap-lg">
            <ChartCard
              title="Tren Penjualan"
              height={mobile ? CHART_HEIGHT.mobile : CHART_HEIGHT.large}
              summary={`Tren penjualan, ${data.points.length} titik data, dengan omzet dan jumlah transaksi per periode.`}
              rowHeader="Periode"
              rowLabels={labels}
              series={[
                { label: 'Omzet', values: revenues.map(formatIDR) },
                {
                  label: 'Transaksi',
                  values: data.points.map((point) => formatCount(point.transactionCount)),
                },
              ]}
            >
              {(width, height) => (
                <SalesTrendChart
                  points={data.points.map((point, index) => ({
                    label: labels[index] ?? '',
                    revenue: point.omzet,
                    transactions: point.transactionCount,
                  }))}
                  width={width}
                  height={height}
                  compact={mobile}
                />
              )}
            </ChartCard>

            <SummaryTiles
              tiles={[
                { label: 'Total Omzet', value: formatIDR(total) },
                { label: 'Rata-rata per Periode', value: formatIDR(mean(revenues)) },
                { label: 'Total Transaksi', value: formatCount(transactions) },
                {
                  label: 'Omzet Tertinggi',
                  value: formatIDR(revenues.length > 0 ? Math.max(...revenues) : 0),
                },
              ]}
            />

            <TableCard title="Rincian Penjualan" exportLabel="data penjualan">
              <DataTable
                columns={salesColumns(data.bucket)}
                rows={data.points}
                keyOf={(row) => row.bucketStart}
              />
            </TableCard>
          </div>
        );
      }}
    </AnalyticsState>
  );
}

/* -------------------------------------------------------------------------- */
/* Time pattern                                                                */
/* -------------------------------------------------------------------------- */

export function TimePatternPanel({ outlets }: CommonProps) {
  const mobile = useBreakpoint() === 'mobile';
  const range = useDateRange();
  const [outletId, setOutletId] = React.useState<string | null>(null);

  const query = useTimePattern(
    { ...range.range, ...(outletId ? { outlet_id: outletId } : {}) },
    { enabled: !range.tooWide }
  );

  const controls = (
    <RangeControls
      range={range}
      outlets={outlets}
      outletId={outletId}
      onOutletChange={setOutletId}
    />
  );

  return (
    <AnalyticsState query={query} controls={controls}>
      {(data) => {
        const points = data.points.map((point) => ({
          hour: point.hourOfDay,
          revenue: point.omzet,
        }));
        const busiest = [...data.points].sort((a, b) => b.omzet - a.omzet)[0];
        const total = sumRupiah(data.points.map((point) => point.omzet));

        return (
          <div className="flex flex-col gap-lg">
            <ChartCard
              title="Pola Waktu Penjualan"
              height={mobile ? CHART_HEIGHT.mobile : CHART_HEIGHT.large}
              summary="Omzet per jam sepanjang hari, diakumulasi atas rentang yang dipilih."
              rowHeader="Jam"
              rowLabels={data.points.map((point) => `${point.hourOfDay}.00`)}
              series={[
                { label: 'Omzet', values: data.points.map((point) => formatIDR(point.omzet)) },
              ]}
            >
              {(width, height) => (
                <HourlyBarChart
                  points={points}
                  peakHours={busiest ? [busiest.hourOfDay] : []}
                  width={width}
                  height={height}
                  compact={mobile}
                />
              )}
            </ChartCard>

            <SummaryTiles
              tiles={[
                {
                  label: 'Jam Tersibuk',
                  value: busiest ? `${busiest.hourOfDay}.00` : '—',
                },
                {
                  label: 'Omzet Jam Tersibuk',
                  value: formatIDR(busiest?.omzet ?? 0),
                },
                {
                  label: 'Kontribusi Jam Tersibuk',
                  value: formatPercent(total > 0 ? ((busiest?.omzet ?? 0) / total) * 100 : 0),
                },
                { label: 'Total Omzet', value: formatIDR(total) },
              ]}
            />

            <TableCard title="Rincian Per Jam" exportLabel="pola waktu">
              <DataTable
                columns={timeColumns}
                rows={data.points}
                keyOf={(row) => String(row.hourOfDay)}
              />
            </TableCard>
          </div>
        );
      }}
    </AnalyticsState>
  );
}

/* -------------------------------------------------------------------------- */
/* AOV                                                                         */
/* -------------------------------------------------------------------------- */

export function AovTrendPanel({ outlets }: CommonProps) {
  const mobile = useBreakpoint() === 'mobile';
  const range = useDateRange();
  const [outletId, setOutletId] = React.useState<string | null>(null);
  const [bucket, setBucket] = React.useState<Bucket>('DAY');

  const query = useAovTrend(
    { ...range.range, bucket, ...(outletId ? { outlet_id: outletId } : {}) },
    { enabled: !range.tooWide }
  );

  const controls = (
    <RangeControls range={range} outlets={outlets} outletId={outletId} onOutletChange={setOutletId}>
      <Segmented
        options={BUCKETS}
        value={bucket}
        onChange={setBucket}
        labels={BUCKET_LABELS}
        accessibilityLabel="Pilih interval"
      />
    </RangeControls>
  );

  return (
    <AnalyticsState query={query} controls={controls}>
      {(data) => {
        const labels = data.points.map((point) => bucketLabel(point.bucketStart, data.bucket));
        const values = data.points.map((point) => point.averageTransactionValue);
        const latest = values.at(-1) ?? 0;

        return (
          <div className="flex flex-col gap-lg">
            <ChartCard
              title="Tren AOV"
              height={mobile ? CHART_HEIGHT.mobile : CHART_HEIGHT.large}
              summary={`Tren nilai rata-rata transaksi, ${data.points.length} titik data.`}
              rowHeader="Periode"
              rowLabels={labels}
              series={[{ label: 'AOV', values: values.map(formatIDR) }]}
            >
              {(width, height) => (
                <AovLineChart
                  points={data.points.map((point, index) => ({
                    label: labels[index] ?? '',
                    aov: point.averageTransactionValue,
                  }))}
                  width={width}
                  height={height}
                />
              )}
            </ChartCard>

            <SummaryTiles
              tiles={[
                { label: 'AOV Terakhir', value: formatIDR(latest) },
                { label: 'AOV Rata-rata', value: formatIDR(mean(values)) },
                {
                  label: 'AOV Tertinggi',
                  value: formatIDR(values.length > 0 ? Math.max(...values) : 0),
                },
                {
                  label: 'AOV Terendah',
                  value: formatIDR(values.length > 0 ? Math.min(...values) : 0),
                },
              ]}
            />

            <TableCard title="Rincian AOV" exportLabel="tren AOV">
              <DataTable
                columns={aovColumns(data.bucket)}
                rows={data.points}
                keyOf={(row) => row.bucketStart}
              />
            </TableCard>
          </div>
        );
      }}
    </AnalyticsState>
  );
}

/* -------------------------------------------------------------------------- */
/* Product performance                                                         */
/* -------------------------------------------------------------------------- */

const PRODUCT_VIEWS = ['TOP', 'LEAST'] as const;
type ProductView = (typeof PRODUCT_VIEWS)[number];

const PRODUCT_VIEW_LABELS: Record<ProductView, string> = {
  TOP: 'Terlaris',
  LEAST: 'Kurang Laku',
};

export function ProductPerformancePanel({ outlets }: CommonProps) {
  const mobile = useBreakpoint() === 'mobile';
  const range = useDateRange();
  const [outletId, setOutletId] = React.useState<string | null>(null);
  const [view, setView] = React.useState<ProductView>('TOP');

  const query = useTopProducts(
    { ...range.range, limit: 10, ...(outletId ? { outlet_id: outletId } : {}) },
    { enabled: !range.tooWide }
  );

  const controls = (
    <RangeControls range={range} outlets={outlets} outletId={outletId} onOutletChange={setOutletId}>
      <Segmented
        options={PRODUCT_VIEWS}
        value={view}
        onChange={setView}
        labels={PRODUCT_VIEW_LABELS}
        accessibilityLabel="Pilih peringkat produk"
      />
    </RangeControls>
  );

  return (
    <AnalyticsState query={query} controls={controls}>
      {(data) => {
        const rows = view === 'TOP' ? data.topSelling : data.leastSelling;
        const total = sumRupiah(rows.map((row) => row.omzet));

        return (
          <div className="flex flex-col gap-lg">
            <ChartCard
              title={view === 'TOP' ? 'Produk Terlaris' : 'Produk Kurang Laku'}
              height={mobile ? CHART_HEIGHT.mobile : CHART_HEIGHT.large}
              summary={`Peringkat produk berdasarkan omzet, ${rows.length} produk.`}
              rowHeader="Produk"
              rowLabels={rows.map((row) => row.name)}
              series={[
                { label: 'Omzet', values: rows.map((row) => formatIDR(row.omzet)) },
                { label: 'Terjual', values: rows.map((row) => formatCount(row.unitsSold)) },
              ]}
            >
              {(width, height) => (
                <ProductPerformanceChart
                  points={rows.map((row) => ({
                    label: truncateLabel(row.name),
                    fullLabel: row.name,
                    revenue: row.omzet,
                    quantity: row.unitsSold,
                  }))}
                  metric="REVENUE"
                  width={width}
                  height={height}
                />
              )}
            </ChartCard>

            <SummaryTiles
              tiles={[
                { label: 'Produk Terdaftar', value: formatCount(rows.length) },
                { label: 'Total Omzet', value: formatIDR(total) },
                {
                  label: 'Total Terjual',
                  value: formatCount(rows.reduce((sum, row) => sum + row.unitsSold, 0)),
                },
                { label: 'Omzet Rata-rata', value: formatIDR(mean(rows.map((row) => row.omzet))) },
              ]}
            />

            <TableCard title="Rincian Produk" exportLabel="performa produk">
              <DataTable
                columns={productColumns}
                rows={rows}
                keyOf={(row) => row.productId}
                emptyMessage="Belum ada penjualan pada rentang ini."
              />
            </TableCard>
          </div>
        );
      }}
    </AnalyticsState>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared shell                                                                */
/* -------------------------------------------------------------------------- */

type QueryLike<T> = { data: T | undefined; isPending: boolean; isError: boolean };

/**
 * The four states every panel has, with the controls kept mounted through all
 * of them — a filter row that disappears while its own result loads cannot be
 * corrected.
 */
function AnalyticsState<T>({
  query,
  controls,
  children,
}: {
  query: QueryLike<T>;
  controls: React.ReactNode;
  children: (data: T) => React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-lg">
      {controls}

      {query.isPending ? (
        <PanelSkeleton />
      ) : query.isError || !query.data ? (
        <div className="flex items-center justify-center py-3xl">
          <Text variant="body" tone="danger">
            Gagal memuat data analitik.
          </Text>
        </div>
      ) : (
        children(query.data)
      )}
    </div>
  );
}

function ChartCard({
  title,
  height,
  summary,
  rowHeader,
  rowLabels,
  series,
  children,
}: {
  title: string;
  height: number;
  summary: string;
  rowHeader?: string;
  rowLabels: string[];
  series: ChartSeries[];
  children: (width: number, height: number) => React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartFigure
          summary={summary}
          {...(rowHeader ? { rowHeader } : {})}
          rowLabels={rowLabels}
          series={series}
        >
          <ChartFrame height={height}>{(width) => children(width, height)}</ChartFrame>
        </ChartFigure>
      </CardContent>
    </Card>
  );
}

function TableCard({
  title,
  exportLabel,
  children,
}: {
  title: string;
  exportLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-md">
        <CardTitle>{title}</CardTitle>
        <ExportButton label={exportLabel} />
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/**
 * Export is a stub, and says so.
 *
 * There is no export endpoint anywhere in the contract, so the button explains
 * that rather than producing a file the server never generated.
 */
function ExportButton({ label }: { label: string }) {
  const { toast } = useToast();

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() =>
        toast({
          title: 'Ekspor belum tersedia',
          description: `Ekspor ${label} belum didukung API. Salin angka dari tabel untuk sementara.`,
        })
      }
    >
      <Icon as={Download} size={16} />
      <Text>Ekspor</Text>
    </Button>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = React.useId();

  return (
    <div className="flex flex-col gap-xs">
      <label htmlFor={id}>
        <Text variant="label" tone="muted">
          {label}
        </Text>
      </label>
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-[150px]"
      />
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="flex flex-col gap-lg">
      <Card>
        <CardContent className="flex flex-col gap-md pt-lg">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-72 w-full" />
        </CardContent>
      </Card>
      <div className="flex flex-row flex-wrap gap-md">
        {[0, 1, 2, 3].map((key) => (
          <Skeleton key={key} className="h-24 min-w-[140px] flex-1" />
        ))}
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/** Axis labels have no room for a long product name. */
function truncateLabel(name: string): string {
  return name.length > 14 ? `${name.slice(0, 13)}…` : name;
}

/** Truncated, never rounded up into money nobody took. */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.trunc(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function defaultMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: isoDay(start), end: isoDay(end) };
}

function isoDay(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/* -------------------------------------------------------------------------- */
/* Columns                                                                     */
/* -------------------------------------------------------------------------- */

function salesColumns(bucket: Bucket): Column<SalesTrendPoint>[] {
  return [
    {
      key: 'bucket',
      label: bucket === 'HOUR' ? 'Jam' : 'Tanggal',
      weight: 1.4,
      render: (row) => <Text variant="body-strong">{bucketLabel(row.bucketStart, bucket)}</Text>,
    },
    {
      key: 'omzet',
      label: 'Total Penjualan',
      align: 'right',
      render: (row) => <Text variant="mono">{formatIDR(row.omzet)}</Text>,
    },
    {
      key: 'transactions',
      label: 'Jumlah Transaksi',
      align: 'right',
      render: (row) => <Text variant="mono">{formatCount(row.transactionCount)}</Text>,
    },
  ];
}

const timeColumns: Column<TimePatternPoint>[] = [
  {
    key: 'hour',
    label: 'Jam',
    render: (row) => <Text variant="body-strong">{String(row.hourOfDay).padStart(2, '0')}.00</Text>,
  },
  {
    key: 'omzet',
    label: 'Omzet',
    align: 'right',
    render: (row) => <Text variant="mono">{formatIDR(row.omzet)}</Text>,
  },
  {
    key: 'transactions',
    label: 'Transaksi',
    align: 'right',
    render: (row) => <Text variant="mono">{formatCount(row.transactionCount)}</Text>,
  },
];

function aovColumns(bucket: Bucket): Column<AovTrendPoint>[] {
  return [
    {
      key: 'bucket',
      label: 'Periode',
      render: (row) => <Text variant="body-strong">{bucketLabel(row.bucketStart, bucket)}</Text>,
    },
    {
      key: 'aov',
      label: 'AOV',
      align: 'right',
      render: (row) => <Text variant="mono">{formatIDR(row.averageTransactionValue)}</Text>,
    },
  ];
}

const productColumns: Column<ProductRank>[] = [
  {
    key: 'product',
    label: 'Produk',
    weight: 2,
    render: (row) => <Text variant="body-strong">{row.name}</Text>,
  },
  {
    key: 'sold',
    label: 'Terjual',
    align: 'right',
    render: (row) => <Text variant="mono">{formatCount(row.unitsSold)}</Text>,
  },
  {
    key: 'omzet',
    label: 'Omzet',
    align: 'right',
    render: (row) => <Text variant="mono">{formatIDR(row.omzet)}</Text>,
  },
];
