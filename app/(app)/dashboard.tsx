/**
 * `/dashboard` renders a different product for each role: the Owner's business
 * dashboard (S-03) and the Admin's stock overview (S-14).
 *
 * One route rather than two because Expo Router resolves `(owner)/dashboard`
 * and `(admin)/dashboard` to the same URL — route groups do not appear in the
 * path. The role matrix still decides who may open it; this only decides what
 * they see once they are through.
 */

import { ScrollView, View } from 'react-native';

import { useAuth } from '@/components/auth/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useAdminDashboard, useOwnerDashboard } from '@/hooks/use-dashboard';
import { formatIDR } from '@/lib/money';
import { formatCount, formatPercentDelta } from '@/lib/number';

export default function DashboardScreen() {
  const { role } = useAuth();

  if (role === 'ADMIN') return <AdminDashboard />;
  return <OwnerDashboard />;
}

/* -------------------------------------------------------------------------- */

function OwnerDashboard() {
  // One query for the whole screen: GET /dashboard/owner is a single fat
  // endpoint, so there is one loading state here and no waterfall.
  const dashboard = useOwnerDashboard();

  if (dashboard.isPending) return <DashboardSkeleton />;
  if (dashboard.isError || !dashboard.data) {
    return <LoadFailure message="Gagal memuat dashboard." />;
  }

  const { summary, merchantOverview } = dashboard.data;

  return (
    <ScrollView contentContainerClassName="gap-lg p-lg desktop:mx-auto desktop:w-full desktop:max-w-[1200px]">
      <View className="gap-xs">
        <Text variant="h1">{merchantOverview.merchantName}</Text>
        <Text variant="body" tone="muted">
          Ringkasan bisnis bulan ini di {formatCount(summary.totalOutlets)} outlet.
        </Text>
      </View>

      <View className="gap-md tablet:flex-row">
        <StatTile
          label="Omzet"
          value={formatIDR(summary.totalRevenue)}
          delta={summary.revenueGrowth}
        />
        <StatTile
          label="Transaksi"
          value={formatCount(summary.totalTransactions)}
          delta={summary.transactionsGrowth}
        />
        <StatTile label="Rata-rata / transaksi" value={formatIDR(summary.averageOrderValue)} />
      </View>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard lengkap menyusul</CardTitle>
          <CardDescription>
            Tren penjualan, performa outlet, produk terlaris, dan pola jam ramai (S-03).
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-sm">
          <Text variant="body" tone="muted">
            {formatCount(merchantOverview.totalProductsActive)} produk ·{' '}
            {formatCount(merchantOverview.totalEmployeesActive)} karyawan ·{' '}
            {formatCount(merchantOverview.totalCategories)} kategori
          </Text>
        </CardContent>
      </Card>
    </ScrollView>
  );
}

/* -------------------------------------------------------------------------- */

function AdminDashboard() {
  const dashboard = useAdminDashboard();

  if (dashboard.isPending) return <DashboardSkeleton />;
  if (dashboard.isError || !dashboard.data) {
    return <LoadFailure message="Gagal memuat dashboard stok." />;
  }

  const { summary } = dashboard.data;

  return (
    <ScrollView contentContainerClassName="gap-lg p-lg desktop:mx-auto desktop:w-full desktop:max-w-[1200px]">
      <View className="gap-xs">
        <Text variant="h1">Dashboard Stok</Text>
        <Text variant="body" tone="muted">
          Kondisi persediaan di {formatCount(summary.totalOutlets)} outlet.
        </Text>
      </View>

      <View className="gap-md tablet:flex-row">
        <StatTile label="Nilai stok" value={formatIDR(summary.totalStockValue)} />
        <StatTile label="Stok menipis" value={formatCount(summary.lowStockProductsCount)} />
        <StatTile label="Stok habis" value={formatCount(summary.outOfStockProductsCount)} />
      </View>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard lengkap menyusul</CardTitle>
          <CardDescription>
            Daftar peringatan stok dan ringkasan per outlet (S-14).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Text variant="body" tone="muted">
            {formatCount(summary.totalStockItems)} unit tersimpan ·{' '}
            {formatCount(summary.totalProducts)} produk aktif
          </Text>
        </CardContent>
      </Card>
    </ScrollView>
  );
}

/* -------------------------------------------------------------------------- */

function StatTile({ label, value, delta }: { label: string; value: string; delta?: number }) {
  return (
    <Card className="tablet:flex-1">
      <CardContent className="gap-xs pt-lg">
        <Text variant="label" tone="muted">
          {label}
        </Text>
        {/* Money and counts are mono so columns of figures line up. */}
        <Text variant="mono" className="type-h1">
          {value}
        </Text>
        {delta !== undefined && (
          <Text variant="caption" tone={delta >= 0 ? 'success' : 'danger'}>
            {formatPercentDelta(delta)} dari periode lalu
          </Text>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <View className="gap-lg p-lg">
      <Skeleton className="h-8 w-56" />
      <View className="gap-md tablet:flex-row">
        <Skeleton className="h-24 flex-1" />
        <Skeleton className="h-24 flex-1" />
        <Skeleton className="h-24 flex-1" />
      </View>
      <Skeleton className="h-32 w-full" />
    </View>
  );
}

function LoadFailure({ message }: { message: string }) {
  return (
    <View className="flex-1 items-center justify-center p-xl">
      <Text variant="body" tone="danger">
        {message}
      </Text>
    </View>
  );
}
