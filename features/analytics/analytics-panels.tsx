import { Download } from 'lucide-react-native';
import * as React from 'react';
import { Alert, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type Option,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { SummaryTiles } from '@/features/analytics/summary-tiles';
import { AovLineChart } from '@/features/charts/aov-line-chart';
import { CHART_HEIGHT, ChartFrame } from '@/features/charts/chart-frame';
import { HourlyBarChart } from '@/features/charts/hourly-bar-chart';
import { ProductPerformanceChart } from '@/features/charts/product-performance-chart';
import { SalesTrendChart } from '@/features/charts/sales-trend-chart';
import { OutletSelect, PeriodSegmented, Segmented } from '@/features/owner/controls';
import { DataTable, type Column } from '@/features/owner/data-table';
import { DeltaChip } from '@/features/owner/delta-chip';
import {
  useAovTrend,
  useProductPerformance,
  useSalesTrend,
  useTimePattern,
} from '@/hooks/use-analytics';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import type {
  AovTrend,
  ProductPerformanceRow,
  SalesTrendPoint,
  TimePattern,
} from '@/lib/api/domains/analytics';
import type { Outlet } from '@/lib/api/domains/outlets';
import type { Interval } from '@/lib/api/schema';
import { formatDate, toApiDate } from '@/lib/date';
import { formatIDR } from '@/lib/money';
import { formatCount, formatPercent } from '@/lib/number';

type CommonProps = { outlets: Outlet[] };

const INTERVALS = ['DAILY', 'WEEKLY', 'MONTHLY'] as const satisfies readonly Interval[];
const INTERVAL_LABELS: Record<Interval, string> = {
  DAILY: 'Harian',
  WEEKLY: 'Mingguan',
  MONTHLY: 'Bulanan',
};

const SHORT_PERIODS = ['TODAY', 'THIS_WEEK', 'THIS_MONTH'] as const;
const AOV_PERIODS = ['THIS_WEEK', 'THIS_MONTH', 'THIS_QUARTER', 'THIS_YEAR'] as const;
const PRODUCT_PERIODS = ['THIS_WEEK', 'THIS_MONTH', 'THIS_QUARTER'] as const;

export function SalesTrendPanel({ outlets }: CommonProps) {
  const mobile = useBreakpoint() === 'mobile';
  const initial = React.useMemo(() => defaultMonthRange(), []);
  const [startDate, setStartDate] = React.useState(initial.start);
  const [endDate, setEndDate] = React.useState(initial.end);
  const [outletId, setOutletId] = React.useState<string | null>(null);
  const [interval, setInterval] = React.useState<Interval>('DAILY');
  const query = useSalesTrend({
    start_date: startDate,
    end_date: endDate,
    interval,
    ...(outletId ? { outlet_id: outletId } : {}),
  });

  return (
    <AnalyticsState query={query}>
      {(data) => (
        <View className="gap-lg">
          <View className="flex-row flex-wrap items-end gap-md">
            <DateField label="Dari" value={startDate} onChange={setStartDate} />
            <DateField label="Sampai" value={endDate} onChange={setEndDate} />
            <OutletSelect outlets={outlets} value={outletId} onChange={setOutletId} />
            <Segmented
              options={INTERVALS}
              value={interval}
              onChange={setInterval}
              labels={INTERVAL_LABELS}
              accessibilityLabel="Pilih interval"
            />
          </View>

          <ChartCard
            title="Tren Penjualan"
            height={mobile ? CHART_HEIGHT.mobile : CHART_HEIGHT.large}
          >
            {(width, height) => (
              <SalesTrendChart
                points={data.trend.map((point) => ({
                  label: formatDate(point.date),
                  revenue: point.totalSales,
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
              { label: 'Total Omzet', value: formatIDR(data.summary.totalRevenue) },
              {
                label: 'Rata-rata Omzet Harian',
                value: formatIDR(data.summary.averageDailyRevenue),
              },
              { label: 'Total Transaksi', value: formatCount(data.summary.totalTransactions) },
              {
                label: 'Rata-rata Transaksi Harian',
                value: formatCount(data.summary.averageDailyTransactions),
              },
            ]}
          />

          <TableCard
            title="Rincian Penjualan"
            action={
              <Button
                variant="ghost"
                size="sm"
                accessibilityLabel="Ekspor data penjualan"
                onPress={() =>
                  Alert.alert('Ekspor', 'Data penjualan siap diekspor dari aplikasi web.')
                }
              >
                <Icon as={Download} size={16} className="text-fg-muted" />
                <Text>Ekspor</Text>
              </Button>
            }
          >
            <DataTable rows={data.trend} keyOf={(row) => row.date} columns={salesColumns} />
          </TableCard>
        </View>
      )}
    </AnalyticsState>
  );
}

export function TimePatternPanel({ outlets }: CommonProps) {
  const mobile = useBreakpoint() === 'mobile';
  const [outletId, setOutletId] = React.useState<string | null>(null);
  const [period, setPeriod] = React.useState<(typeof SHORT_PERIODS)[number]>('THIS_MONTH');
  const query = useTimePattern({ period, ...(outletId ? { outlet_id: outletId } : {}) });

  return (
    <AnalyticsState query={query}>
      {(data) => {
        const totalRevenue = data.patterns.reduce((sum, point) => sum + point.revenue, 0);
        const totalTransactions = data.patterns.reduce(
          (sum, point) => sum + point.transactionCount,
          0
        );

        return (
          <View className="gap-lg">
            <View className="flex-row flex-wrap items-center gap-md">
              <OutletSelect outlets={outlets} value={outletId} onChange={setOutletId} />
              <PeriodSegmented
                value={period}
                onChange={(value) => setPeriod(value as (typeof SHORT_PERIODS)[number])}
                options={SHORT_PERIODS}
              />
            </View>

            <View className="gap-lg desktop:flex-row">
              <ChartCard
                title="Pola Waktu"
                height={mobile ? CHART_HEIGHT.mobile : CHART_HEIGHT.large}
                className="desktop:flex-1"
              >
                {(width, height) => (
                  <HourlyBarChart
                    points={data.patterns}
                    peakHours={data.peakHours}
                    width={width}
                    height={height}
                    compact={mobile}
                  />
                )}
              </ChartCard>
              <PeakHoursCard data={data} />
            </View>

            <SummaryTiles
              tiles={[
                { label: 'Total Omzet', value: formatIDR(totalRevenue) },
                { label: 'Total Transaksi', value: formatCount(totalTransactions) },
                {
                  label: 'Rata-rata Transaksi per Jam',
                  value: formatCount(data.averageTransactionsPerHour),
                },
                { label: 'Jumlah Jam Sibuk', value: formatCount(data.peakHours.length) },
              ]}
            />

            <TableCard title="Rincian per Jam">
              <DataTable
                rows={data.patterns}
                keyOf={(row) => String(row.hour)}
                columns={timeColumns}
              />
            </TableCard>
          </View>
        );
      }}
    </AnalyticsState>
  );
}

export function AovTrendPanel({ outlets }: CommonProps) {
  const mobile = useBreakpoint() === 'mobile';
  const [outletId, setOutletId] = React.useState<string | null>(null);
  const [period, setPeriod] = React.useState<(typeof AOV_PERIODS)[number]>('THIS_MONTH');
  const query = useAovTrend({ period, ...(outletId ? { outlet_id: outletId } : {}) });

  return (
    <AnalyticsState query={query}>
      {(data) => {
        const transactions = data.trend.reduce((sum, point) => sum + point.transactionCount, 0);
        const highest = Math.max(...data.trend.map((point) => point.aov), 0);

        return (
          <View className="gap-lg">
            <View className="flex-row flex-wrap items-center gap-md">
              <OutletSelect outlets={outlets} value={outletId} onChange={setOutletId} />
              <PeriodSegmented
                value={period}
                onChange={(value) => setPeriod(value as (typeof AOV_PERIODS)[number])}
                options={AOV_PERIODS}
              />
            </View>

            <Card>
              <CardHeader className="flex-row flex-wrap items-start justify-between gap-md">
                <View className="gap-xs">
                  <CardTitle>Tren AOV</CardTitle>
                  <Text variant="display" className="mt-sm">
                    {formatIDR(data.overallAov)}
                  </Text>
                </View>
                <DeltaChip value={data.aovChangePercentage} label="AOV" />
              </CardHeader>
              <CardContent>
                <ChartFrame height={mobile ? CHART_HEIGHT.mobile : CHART_HEIGHT.large}>
                  {(width) => (
                    <AovLineChart
                      points={data.trend.map((point) => ({ label: point.period, aov: point.aov }))}
                      width={width}
                      height={mobile ? CHART_HEIGHT.mobile : CHART_HEIGHT.large}
                    />
                  )}
                </ChartFrame>
              </CardContent>
            </Card>

            <SummaryTiles
              tiles={[
                { label: 'AOV Saat Ini', value: formatIDR(data.overallAov) },
                { label: 'Perubahan AOV', value: formatPercent(data.aovChangePercentage) },
                { label: 'AOV Tertinggi', value: formatIDR(highest) },
                { label: 'Jumlah Transaksi', value: formatCount(transactions) },
              ]}
            />

            <TableCard title="Rincian AOV">
              <DataTable rows={data.trend} keyOf={(row) => row.period} columns={aovColumns} />
            </TableCard>
          </View>
        );
      }}
    </AnalyticsState>
  );
}

export function ProductPerformancePanel({ outlets }: CommonProps) {
  const mobile = useBreakpoint() === 'mobile';
  const [outletId, setOutletId] = React.useState<string | null>(null);
  const [period, setPeriod] = React.useState<(typeof PRODUCT_PERIODS)[number]>('THIS_MONTH');
  const [sortBy, setSortBy] = React.useState<'REVENUE' | 'QUANTITY'>('REVENUE');
  const [limit, setLimit] = React.useState(10);
  const query = useProductPerformance({
    period,
    sort_by: sortBy,
    limit,
    ...(outletId ? { outlet_id: outletId } : {}),
  });

  return (
    <AnalyticsState query={query}>
      {(data) => {
        const topRevenue = data.topSellers.reduce((sum, row) => sum + row.totalRevenue, 0);
        const topSold = data.topSellers.reduce((sum, row) => sum + row.totalSold, 0);

        return (
          <View className="gap-lg">
            <View className="flex-row flex-wrap items-center gap-md">
              <OutletSelect outlets={outlets} value={outletId} onChange={setOutletId} />
              <PeriodSegmented
                value={period}
                onChange={(value) => setPeriod(value as (typeof PRODUCT_PERIODS)[number])}
                options={PRODUCT_PERIODS}
              />
              <Segmented
                options={['REVENUE', 'QUANTITY'] as const}
                value={sortBy}
                onChange={setSortBy}
                labels={{ REVENUE: 'Omzet', QUANTITY: 'Kuantitas' }}
                accessibilityLabel="Urutkan performa produk"
              />
              <LimitSelect value={limit} onChange={setLimit} />
            </View>

            <ChartCard
              title="Performa Produk Terlaris"
              height={mobile ? CHART_HEIGHT.mobile : CHART_HEIGHT.large}
            >
              {(width, height) => (
                <ProductPerformanceChart
                  points={data.topSellers.map((row) => ({
                    label: row.productName,
                    revenue: row.totalRevenue,
                    quantity: row.totalSold,
                  }))}
                  metric={sortBy}
                  width={width}
                  height={height}
                />
              )}
            </ChartCard>

            <SummaryTiles
              tiles={[
                { label: 'Produk Ditampilkan', value: formatCount(data.topSellers.length) },
                { label: 'Total Omzet Produk', value: formatIDR(topRevenue) },
                { label: 'Total Unit Terjual', value: formatCount(topSold) },
                { label: 'Produk Kurang Laku', value: formatCount(data.underperformers.length) },
              ]}
            />

            <TableCard title="Produk Terlaris">
              <DataTable
                rows={data.topSellers}
                keyOf={(row) => row.productId}
                columns={productColumns(false)}
              />
            </TableCard>

            <TableCard title="Produk Kurang Laku">
              <DataTable
                rows={data.underperformers}
                keyOf={(row) => row.productId}
                columns={productColumns(true)}
              />
            </TableCard>
          </View>
        );
      }}
    </AnalyticsState>
  );
}

function ChartCard({
  title,
  height,
  className,
  children,
}: {
  title: string;
  height: number;
  className?: string;
  children: (width: number, height: number) => React.ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartFrame height={height}>{(width) => children(width, height)}</ChartFrame>
      </CardContent>
    </Card>
  );
}

function TableCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-md">
        <CardTitle>{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
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
  return (
    <View className="min-w-[150px] gap-xs">
      <Text variant="caption" tone="subtle">
        {label}
      </Text>
      <Input
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        accessibilityLabel={`${label} tanggal`}
      />
    </View>
  );
}

function PeakHoursCard({ data }: { data: TimePattern }) {
  return (
    <Card className="desktop:w-[260px]">
      <CardHeader>
        <CardTitle>Jam Sibuk</CardTitle>
      </CardHeader>
      <CardContent className="gap-lg">
        <View className="flex-row flex-wrap gap-sm">
          {data.peakHours.map((hour) => (
            <View key={hour} className="rounded-full bg-accent-subtle px-md py-sm">
              <Text variant="h3" tone="accent">
                {String(hour).padStart(2, '0')}.00
              </Text>
            </View>
          ))}
        </View>
        <View className="gap-xs border-t border-border pt-lg">
          <Text variant="caption" tone="subtle">
            Rata-rata transaksi per jam
          </Text>
          <Text variant="display">{formatCount(data.averageTransactionsPerHour)}</Text>
        </View>
      </CardContent>
    </Card>
  );
}

function LimitSelect({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const selected: Option = { value: String(value), label: `${value} produk` };
  return (
    <Select value={selected} onValueChange={(option) => option && onChange(Number(option.value))}>
      <SelectTrigger className="min-w-[130px]" aria-label="Jumlah produk">
        <SelectValue className="type-body text-fg" placeholder="10 produk" />
      </SelectTrigger>
      <SelectContent>
        {[10, 25, 50].map((item) => (
          <SelectItem key={item} value={String(item)} label={`${item} produk`} />
        ))}
      </SelectContent>
    </Select>
  );
}

type QueryLike<T> = {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
};

function AnalyticsState<T>({
  query,
  children,
}: {
  query: QueryLike<T>;
  children: (data: T) => React.ReactNode;
}) {
  if (query.isPending) return <AnalyticsSkeleton />;
  if (query.isError || !query.data) {
    return (
      <Card>
        <CardContent className="items-center py-xl">
          <Text variant="body" tone="danger">
            Gagal memuat data analitik.
          </Text>
        </CardContent>
      </Card>
    );
  }
  return <>{children(query.data)}</>;
}

function AnalyticsSkeleton() {
  return (
    <View className="gap-lg">
      <View className="flex-row flex-wrap gap-md">
        <Skeleton className="h-11 w-40" />
        <Skeleton className="h-11 w-48" />
        <Skeleton className="h-11 w-64" />
      </View>
      <Card>
        <CardContent className="gap-lg pt-lg">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
      <View className="flex-row flex-wrap gap-md">
        {[0, 1, 2, 3].map((key) => (
          <Skeleton key={key} className="h-24 min-w-[140px] flex-1" />
        ))}
      </View>
      <Skeleton className="h-72 w-full" />
    </View>
  );
}

function defaultMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: toApiDate(start), end: toApiDate(end) };
}

const salesColumns: Column<SalesTrendPoint>[] = [
  {
    key: 'date',
    label: 'Tanggal',
    weight: 1.4,
    render: (row) => <Text variant="body-strong">{formatDate(row.date)}</Text>,
  },
  {
    key: 'sales',
    label: 'Total Penjualan',
    align: 'right',
    render: (row) => <Text variant="mono">{formatIDR(row.totalSales)}</Text>,
  },
  {
    key: 'transactions',
    label: 'Jumlah Transaksi',
    align: 'right',
    render: (row) => <Text variant="mono">{formatCount(row.transactionCount)}</Text>,
  },
];

const timeColumns: Column<TimePattern['patterns'][number]>[] = [
  {
    key: 'hour',
    label: 'Jam',
    render: (row) => <Text variant="body-strong">{String(row.hour).padStart(2, '0')}.00</Text>,
  },
  {
    key: 'revenue',
    label: 'Omzet',
    align: 'right',
    render: (row) => <Text variant="mono">{formatIDR(row.revenue)}</Text>,
  },
  {
    key: 'transactions',
    label: 'Transaksi',
    align: 'right',
    render: (row) => <Text variant="mono">{formatCount(row.transactionCount)}</Text>,
  },
];

const aovColumns: Column<AovTrend['trend'][number]>[] = [
  {
    key: 'period',
    label: 'Periode',
    render: (row) => <Text variant="body-strong">{row.period}</Text>,
  },
  {
    key: 'aov',
    label: 'AOV',
    align: 'right',
    render: (row) => <Text variant="mono">{formatIDR(row.aov)}</Text>,
  },
  {
    key: 'transactions',
    label: 'Jumlah Transaksi',
    align: 'right',
    render: (row) => <Text variant="mono">{formatCount(row.transactionCount)}</Text>,
  },
];

function productColumns(underperformer: boolean): Column<ProductPerformanceRow>[] {
  const columns: Column<ProductPerformanceRow>[] = [
    {
      key: 'rank',
      label: 'Rank',
      weight: 0.5,
      render: (row) => (
        <View
          className={
            row.rank <= 3
              ? 'h-7 w-7 items-center justify-center rounded-full bg-accent-subtle'
              : 'h-7 w-7 items-center justify-center'
          }
        >
          <Text variant="caption" tone={row.rank <= 3 ? 'accent' : 'muted'}>
            {row.rank}
          </Text>
        </View>
      ),
    },
    {
      key: 'product',
      label: 'Produk',
      weight: 1.6,
      render: (row) => <Text variant="body-strong">{row.productName}</Text>,
    },
    { key: 'sku', label: 'SKU', render: (row) => <Text variant="mono">{row.sku}</Text> },
    {
      key: 'category',
      label: 'Kategori',
      render: (row) => <Text>{row.categoryName}</Text>,
    },
    {
      key: 'sold',
      label: 'Terjual',
      align: 'right',
      render: (row) => <Text variant="mono">{formatCount(row.totalSold)}</Text>,
    },
    {
      key: 'revenue',
      label: 'Omzet',
      align: 'right',
      render: (row) => <Text variant="mono">{formatIDR(row.totalRevenue)}</Text>,
    },
  ];

  if (underperformer) {
    columns.push({
      key: 'days',
      label: 'Hari Tanpa Penjualan',
      align: 'right',
      render: (row) => (
        <Text variant="mono" tone="warning">
          {formatCount(row.daysWithoutSale ?? 0)} hari
        </Text>
      ),
    });
  }

  return columns;
}
