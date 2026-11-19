'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CalendarClock,
  Car,
  ChevronRight,
  Headphones,
  Inbox,
  Package,
  TrendingUp,
  Users,
  Wallet,
  Wrench
} from 'lucide-react';
import { clsx } from 'clsx';
import { fetcher } from '@/lib/fetcher';
import { bookingCode, formatRp } from '@/lib/format';
import { StatusBadge } from '@/components/status-badge';
import { Plate } from '@/components/customer/plate';
import { EmptyState, ErrorState, SkeletonBlock } from '@/components/customer/states';
import { useSupportUnread } from '@/components/admin/use-support-unread';
import { adminSchedule, toNumber } from '@/components/admin/format';
import { Segmented } from '@/components/admin/resource-ui';
import {
  STATUS_COLOR,
  STATUS_LABEL,
  STATUS_SEQUENCE,
  StatusDonut,
  TopServicesChart,
  TrendChart,
  type BookingStatus,
  type TrendRow
} from '@/components/admin/charts';

// Bentuk data dari GET /api/v1/admin/dashboard/summary
interface Summary {
  total_revenue: number;
  total_customers: number;
  total_vehicles: number;
  bookings_this_month: number;
  bookings_by_status: Record<BookingStatus, number>;
  top_services: Array<{ service_id: string; name: string; total_bookings: number; total_revenue: number | string }>;
  recent_bookings: Array<{
    id: string;
    status: BookingStatus;
    scheduled_at: string;
    created_at: string;
    customer: { full_name: string; phone: string };
    vehicle: { plate_number: string; brand: string; model: string };
  }>;
  trend: {
    days: number;
    start: string;
    end: string;
    total_revenue: number;
    total_bookings: number;
    rows: TrendRow[];
  };
  stock_alerts: StockAlerts;
}

interface StockAlerts {
  out_of_stock_items: number;
  low_items: number;
  services: Array<{
    id: string;
    name: string;
    is_active: boolean;
    status: 'habis' | 'menipis';
    items: Array<{ id: string; name: string; unit: string; stock_qty: number; min_qty: number; qty_needed: number; status: 'habis' | 'menipis' }>;
  }>;
}

const card = 'rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';
const cardHead =
  'flex min-h-[56px] flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-slate-200 px-5 py-2 dark:border-slate-800';
const h2 = 'text-[15px] font-semibold text-slate-900 dark:text-white';
const nf = new Intl.NumberFormat('id-ID');

export default function DashboardPage() {
  const router = useRouter();
  const [metric, setMetric] = useState<'revenue' | 'bookings'>('revenue');
  const [activeStatus, setActiveStatus] = useState<BookingStatus | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<Summary>({
    queryKey: ['admin-dashboard'],
    queryFn: () => fetcher('/admin/dashboard/summary'),
    refetchInterval: 60_000
  });
  const unreadQuery = useSupportUnread(true, { live: false });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400" aria-live="polite">
            {isFetching ? 'Memperbarui data...' : 'Ringkasan bengkel, diperbarui tiap menit.'}
          </p>
        </div>
        <Link
          href="/admin/bookings"
          className="inline-flex min-h-[44px] items-center rounded-ctl bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
        >
          Kelola booking
        </Link>
      </div>

      {isLoading && <DashboardSkeleton />}

      {isError && (
        <ErrorState
          title="Ringkasan dashboard belum bisa dimuat"
          message={(error as Error)?.message}
          onRetry={() => refetch()}
        />
      )}

      {data && (
        <>
          <StockAlertPanel alerts={data.stock_alerts} />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              icon={Wallet}
              tone="green"
              label="Pendapatan dari booking selesai"
              value={formatRp(toNumber(data.total_revenue))}
              note={`${formatRp(data.trend.total_revenue)} dalam ${data.trend.days} hari terakhir`}
            />
            <Kpi
              icon={CalendarClock}
              tone="blue"
              label="Booking bulan ini"
              value={nf.format(data.bookings_this_month ?? 0)}
              note={`${nf.format(data.trend.total_bookings)} dijadwalkan ${data.trend.days} hari terakhir`}
              href="/admin/bookings"
            />
            <Kpi
              icon={Users}
              tone="violet"
              label="Pelanggan terdaftar"
              value={nf.format(data.total_customers)}
              href="/admin/customers"
            />
            <Kpi
              icon={Car}
              tone="amber"
              label="Kendaraan terdaftar"
              value={nf.format(data.total_vehicles)}
              href="/admin/vehicles"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-5">
            <StatusPanel
              counts={data.bookings_by_status}
              active={activeStatus}
              onActiveChange={setActiveStatus}
              onSelect={(status) => router.push(`/admin/bookings?status=${status}`)}
            />
            <TrendPanel trend={data.trend} metric={metric} onMetricChange={setMetric} />
          </div>

          <div className="grid gap-4 xl:grid-cols-5">
            <ActionPanel
              waiting={data.bookings_by_status?.menunggu ?? 0}
              unread={unreadQuery.data}
              unreadLoading={unreadQuery.isLoading}
              unreadError={unreadQuery.isError}
              onRetryUnread={() => unreadQuery.refetch()}
            />
            <TopServices rows={data.top_services ?? []} />
          </div>

          <RecentBookings rows={data.recent_bookings ?? []} />
        </>
      )}
    </div>
  );
}

/**
 * Peringatan stok: layanan yang barangnya habis masih bisa dipesan pelanggan selama
 * statusnya aktif, jadi panel ini menyediakan tombol nonaktifkan langsung di tempat.
 */
function StockAlertPanel({ alerts }: { alerts: StockAlerts | undefined }) {
  const qc = useQueryClient();
  const [dismissed, setDismissed] = useState(false);

  const deactivate = useMutation({
    mutationFn: (serviceId: string) =>
      fetcher(`/admin/services/${serviceId}`, { method: 'PUT', body: JSON.stringify({ is_active: false }) }),
    onSuccess: () => {
      toast.success('Layanan dinonaktifkan dari katalog pelanggan');
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
      qc.invalidateQueries({ queryKey: ['admin-services'] });
      qc.invalidateQueries({ queryKey: ['admin-inventory'] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const services = alerts?.services ?? [];
  if (!alerts || services.length === 0 || dismissed) return null;

  const urgent = services.filter((s) => s.status === 'habis' && s.is_active);
  const critical = urgent.length > 0;

  return (
    <section
      role="status"
      aria-labelledby="stock-alert-title"
      className={clsx(
        'rounded-2xl border',
        critical
          ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40'
          : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40'
      )}
    >
      <div className="flex flex-wrap items-start gap-3 px-5 py-4">
        <AlertTriangle
          className={clsx('h-5 w-5 shrink-0', critical ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300')}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <h2
            id="stock-alert-title"
            className={clsx('text-[15px] font-semibold', critical ? 'text-red-900 dark:text-red-100' : 'text-amber-900 dark:text-amber-100')}
          >
            {critical
              ? `${urgent.length} layanan aktif memakai barang yang stoknya habis`
              : `${services.length} layanan perlu dicek stok barangnya`}
          </h2>
          <p className={clsx('text-[13px]', critical ? 'text-red-800 dark:text-red-200' : 'text-amber-800 dark:text-amber-200')}>
            {alerts.out_of_stock_items} barang habis · {alerts.low_items} barang menipis. Nonaktifkan layanannya supaya
            pelanggan tidak memesan servis yang belum bisa dikerjakan.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href="/admin/stok"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-ctl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Package className="h-4 w-4" aria-hidden />
            Kelola stok
          </Link>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="inline-flex min-h-[40px] items-center rounded-ctl px-3 text-sm font-medium text-slate-700 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-slate-900/60 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>

      <ul className="divide-y divide-white/60 border-t border-white/60 dark:divide-slate-800/60 dark:border-slate-800/60">
        {services.slice(0, 5).map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3">
            <span
              aria-hidden
              className={clsx('h-2 w-2 shrink-0 rounded-full', s.status === 'habis' ? 'bg-red-600' : 'bg-amber-500')}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
                {s.name}
                {!s.is_active && <span className="font-normal text-slate-600 dark:text-slate-400"> · sudah nonaktif</span>}
              </span>
              <span className="block truncate text-[13px] text-slate-700 dark:text-slate-300">
                {s.items
                  .map((i) => `${i.name}: ${i.stock_qty} ${i.unit}${i.status === 'habis' ? ' (habis)' : ' (menipis)'}`)
                  .join(' · ')}
              </span>
            </span>
            {s.is_active ? (
              <button
                type="button"
                disabled={deactivate.isPending}
                onClick={() => deactivate.mutate(s.id)}
                className="inline-flex min-h-[40px] shrink-0 items-center rounded-ctl bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 transition-colors"
              >
                {deactivate.isPending ? 'Memproses...' : 'Nonaktifkan layanan'}
              </button>
            ) : (
              <span className="shrink-0 text-[13px] text-slate-600 dark:text-slate-400">Tidak dipesan pelanggan</span>
            )}
          </li>
        ))}
      </ul>

      {services.length > 5 && (
        <p className="px-5 pb-3 text-[13px] text-slate-700 dark:text-slate-300">
          dan {services.length - 5} layanan lain.{' '}
          <Link href="/admin/stok" className="font-semibold underline-offset-2 hover:underline">
            Lihat semuanya di halaman Stok
          </Link>
        </p>
      )}
    </section>
  );
}

const KPI_TONE: Record<string, string> = {
  green: 'bg-green-50 text-green-700 dark:bg-green-950/60 dark:text-green-300',
  blue: 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-100',
  violet: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
};

function Kpi({
  icon: Icon,
  tone,
  label,
  value,
  note,
  href
}: {
  icon: React.ElementType;
  tone: keyof typeof KPI_TONE;
  label: string;
  value: string;
  note?: string;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-ctl', KPI_TONE[tone])}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        {href && <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />}
      </div>
      <dt className="mt-3 text-[13px] text-slate-600 dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">{value}</dd>
      {note && <p className="mt-1 text-[12px] tabular-nums text-slate-500 dark:text-slate-400">{note}</p>}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={clsx(
          card,
          'block p-5 transition-colors hover:border-primary-600 hover:bg-primary-50/40 dark:hover:border-primary-500 dark:hover:bg-primary-900/10'
        )}
      >
        <dl>{body}</dl>
      </Link>
    );
  }

  return (
    <div className={clsx(card, 'p-5')}>
      <dl>{body}</dl>
    </div>
  );
}

function StatusPanel({
  counts,
  active,
  onActiveChange,
  onSelect
}: {
  counts: Record<BookingStatus, number>;
  active: BookingStatus | null;
  onActiveChange: (s: BookingStatus | null) => void;
  onSelect: (s: BookingStatus) => void;
}) {
  const total = STATUS_SEQUENCE.reduce((s, key) => s + (counts?.[key] ?? 0), 0);

  return (
    <section aria-labelledby="status-title" className={clsx(card, 'min-w-0 xl:col-span-2')}>
      <div className={cardHead}>
        <h2 id="status-title" className={h2}>
          Distribusi status booking
        </h2>
        <span className="text-[13px] tabular-nums text-slate-600 dark:text-slate-400">{nf.format(total)} booking</span>
      </div>
      <div className="p-5">
        <StatusDonut counts={counts} active={active} onActiveChange={onActiveChange} onSelect={onSelect} />

        {/* Legenda sekaligus jalan pintas: bisa dipakai dengan keyboard, tidak seperti sektor SVG. */}
        <ul className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-1">
          {STATUS_SEQUENCE.map((key) => {
            const n = counts?.[key] ?? 0;
            const pct = total ? Math.round((n / total) * 100) : 0;
            return (
              <li key={key}>
                <Link
                  href={`/admin/bookings?status=${key}`}
                  onMouseEnter={() => onActiveChange(key)}
                  onMouseLeave={() => onActiveChange(null)}
                  onFocus={() => onActiveChange(key)}
                  onBlur={() => onActiveChange(null)}
                  className={clsx(
                    'flex min-h-[40px] items-center gap-2.5 rounded-chip px-2.5 transition-colors',
                    active === key ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  )}
                >
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: STATUS_COLOR[key] }}
                  />
                  <span className="flex-1 truncate text-[13px] text-slate-700 dark:text-slate-300">
                    {STATUS_LABEL[key]}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                    {nf.format(n)}
                  </span>
                  <span className="w-9 shrink-0 text-right text-[12px] tabular-nums text-slate-500 dark:text-slate-400">
                    {pct}%
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function TrendPanel({
  trend,
  metric,
  onMetricChange
}: {
  trend: Summary['trend'];
  metric: 'revenue' | 'bookings';
  onMetricChange: (m: 'revenue' | 'bookings') => void;
}) {
  const headline = metric === 'revenue' ? formatRp(trend.total_revenue) : `${nf.format(trend.total_bookings)} booking`;

  return (
    <section aria-labelledby="trend-title" className={clsx(card, 'min-w-0 xl:col-span-3')}>
      <div className={cardHead}>
        <div className="min-w-0">
          <h2 id="trend-title" className={h2}>
            Tren {trend.days} hari terakhir
          </h2>
          <p className="text-[13px] text-slate-600 dark:text-slate-400">
            Dihitung per hari kalender WIB berdasarkan jadwal servis.
          </p>
        </div>
        <Segmented
          label="Metrik tren"
          value={metric}
          onChange={onMetricChange}
          options={[
            { value: 'revenue', label: 'Pendapatan' },
            { value: 'bookings', label: 'Booking' }
          ]}
        />
      </div>
      <div className="space-y-3 p-5">
        <p className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
            {headline}
          </span>
          <span className="inline-flex items-center gap-1 text-[13px] text-slate-600 dark:text-slate-400">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden />
            {metric === 'revenue' ? 'dari booking berstatus selesai' : 'dijadwalkan pada rentang ini'}
          </span>
        </p>
        <TrendChart rows={trend.rows} metric={metric} />
      </div>
    </section>
  );
}

function ActionPanel({
  waiting,
  unread,
  unreadLoading,
  unreadError,
  onRetryUnread
}: {
  waiting: number;
  unread: number | undefined;
  unreadLoading: boolean;
  unreadError: boolean;
  onRetryUnread: () => void;
}) {
  return (
    <section aria-labelledby="todo-title" className={clsx(card, 'min-w-0 xl:col-span-2')}>
      <div className={cardHead}>
        <h2 id="todo-title" className={h2}>
          Perlu ditindak
        </h2>
      </div>
      <ul className="divide-y divide-slate-200 dark:divide-slate-800">
        <li>
          <Link
            href="/admin/bookings?status=menunggu"
            className="flex min-h-[72px] items-center gap-4 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ctl bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              <CalendarClock className="h-5 w-5" aria-hidden />
            </span>
            <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">Booking menunggu konfirmasi</span>
            <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{nf.format(waiting)}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          </Link>
        </li>
        <li>
          {unreadError ? (
            <div className="flex min-h-[72px] items-center gap-4 px-5 py-3">
              <Headphones className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
              <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">Jumlah chat belum bisa dimuat</span>
              <button
                type="button"
                onClick={onRetryUnread}
                className="min-h-[44px] rounded-ctl px-3 text-sm font-semibold text-primary-700 hover:bg-primary-50 dark:text-primary-100 dark:hover:bg-primary-900/40 transition-colors"
              >
                Coba lagi
              </button>
            </div>
          ) : (
            <Link
              href="/admin/support"
              className="flex min-h-[72px] items-center gap-4 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ctl bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-100">
                <Headphones className="h-5 w-5" aria-hidden />
              </span>
              <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">Chat pelanggan belum dibalas</span>
              {unreadLoading ? (
                <SkeletonBlock className="h-7 w-8" />
              ) : (
                <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {nf.format(unread ?? 0)}
                </span>
              )}
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            </Link>
          )}
        </li>
      </ul>
    </section>
  );
}

function RecentBookings({ rows }: { rows: Summary['recent_bookings'] }) {
  return (
    <section aria-labelledby="recent-title" className={clsx(card, 'min-w-0')}>
      <div className={cardHead}>
        <h2 id="recent-title" className={h2}>
          Booking terbaru masuk
        </h2>
        <Link
          href="/admin/bookings"
          className="inline-flex min-h-[44px] items-center text-sm font-semibold text-primary-700 hover:underline dark:text-primary-100"
        >
          Lihat semua
        </Link>
      </div>
      {rows.length === 0 ? (
        <div className="p-5">
          <EmptyState icon={Inbox} title="Belum ada booking" description="Booking dari pelanggan akan muncul di sini." />
        </div>
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {rows.map((b) => (
            <li key={b.id}>
              <Link
                href={`/admin/bookings?search=${encodeURIComponent(b.vehicle.plate_number)}&id=${b.id}`}
                className="flex min-h-[56px] items-center gap-3 px-5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <Plate number={b.vehicle.plate_number} size="sm" className="shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
                    {b.customer.full_name}
                  </span>
                  <span className="block truncate text-[13px] text-slate-600 dark:text-slate-400">
                    <span className="font-mono">{bookingCode(b.id)}</span> · {b.vehicle.brand} {b.vehicle.model}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 sm:hidden">
                    <StatusBadge status={b.status} size="sm" />
                    <span className="text-[13px] tabular-nums text-slate-600 dark:text-slate-400">
                      {adminSchedule(b.scheduled_at)}
                    </span>
                  </span>
                </span>
                <span className="hidden shrink-0 text-right text-[13px] tabular-nums text-slate-600 dark:text-slate-400 sm:block">
                  {adminSchedule(b.scheduled_at)}
                </span>
                <span className="hidden shrink-0 sm:inline-flex">
                  <StatusBadge status={b.status} size="sm" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TopServices({ rows }: { rows: Summary['top_services'] }) {
  const router = useRouter();
  const data = rows.map((r) => ({
    service_id: r.service_id,
    name: r.name,
    total_bookings: r.total_bookings,
    total_revenue: toNumber(r.total_revenue)
  }));

  return (
    <section aria-labelledby="top-title" className={clsx(card, 'min-w-0 xl:col-span-3')}>
      <div className={cardHead}>
        <h2 id="top-title" className={h2}>
          Layanan paling sering dipesan
        </h2>
        <Link
          href="/admin/services"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline dark:text-primary-100"
        >
          <Wrench className="h-4 w-4" aria-hidden />
          Katalog layanan
        </Link>
      </div>
      {data.length === 0 ? (
        <div className="p-5">
          <EmptyState title="Belum ada data layanan" description="Muncul setelah ada booking dengan layanan." />
        </div>
      ) : (
        <div className="p-5">
          <TopServicesChart rows={data} onSelect={() => router.push('/admin/services')} />
          <ol className="mt-3 space-y-1">
            {data.map((s, i) => (
              <li
                key={s.service_id ?? i}
                className="flex items-baseline justify-between gap-3 text-[13px] text-slate-600 dark:text-slate-400"
              >
                <span className="min-w-0 truncate">
                  <span className="mr-1.5 tabular-nums">{i + 1}.</span>
                  {s.name}
                </span>
                <span className="shrink-0 tabular-nums">
                  {nf.format(s.total_bookings)}x · {formatRp(s.total_revenue)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-label="Memuat ringkasan" role="status">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-[136px] rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-5">
        <SkeletonBlock className="h-[480px] rounded-2xl xl:col-span-2" />
        <SkeletonBlock className="h-[480px] rounded-2xl xl:col-span-3" />
      </div>
      <div className="grid gap-4 xl:grid-cols-5">
        <SkeletonBlock className="h-[200px] rounded-2xl xl:col-span-2" />
        <SkeletonBlock className="h-[360px] rounded-2xl xl:col-span-3" />
      </div>
    </div>
  );
}
