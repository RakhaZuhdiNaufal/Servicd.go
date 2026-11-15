'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, ChevronRight, Headphones, Inbox } from 'lucide-react';
import { clsx } from 'clsx';
import { fetcher } from '@/lib/fetcher';
import { bookingCode, formatRp } from '@/lib/format';
import { StatusBadge } from '@/components/status-badge';
import { Plate } from '@/components/customer/plate';
import { EmptyState, ErrorState, SkeletonBlock } from '@/components/customer/states';
import { useSupportUnread } from '@/components/admin/use-support-unread';
import { adminSchedule, toNumber } from '@/components/admin/format';

type BookingStatus = 'menunggu' | 'dikonfirmasi' | 'diproses' | 'selesai' | 'dibatalkan';

// Bentuk data dari GET /api/v1/admin/dashboard/summary
interface Summary {
  total_revenue: number;
  total_customers: number;
  total_vehicles: number;
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
}

const STATUS_ORDER: Array<{ key: BookingStatus; label: string; bar: string }> = [
  { key: 'menunggu', label: 'Menunggu', bar: 'bg-amber-500' },
  { key: 'dikonfirmasi', label: 'Dikonfirmasi', bar: 'bg-sky-500' },
  { key: 'diproses', label: 'Diproses', bar: 'bg-primary-600' },
  { key: 'selesai', label: 'Selesai', bar: 'bg-green-600' },
  { key: 'dibatalkan', label: 'Dibatalkan', bar: 'bg-red-600' }
];

const card = 'rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';
const cardHead = 'flex min-h-[56px] items-center justify-between gap-3 border-b border-slate-200 px-5 py-1.5 dark:border-slate-800';
const h2 = 'text-[15px] font-semibold text-slate-900 dark:text-white';
const nf = new Intl.NumberFormat('id-ID');

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<Summary>({
    queryKey: ['admin-dashboard'],
    queryFn: () => fetcher('/admin/dashboard/summary'),
    refetchInterval: 60_000
  });
  const unreadQuery = useSupportUnread(true, { live: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Ringkasan bengkel, diperbarui tiap menit.</p>
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
          <div className="grid gap-4 lg:grid-cols-3">
            <ActionPanel
              waiting={data.bookings_by_status?.menunggu ?? 0}
              unread={unreadQuery.data}
              unreadLoading={unreadQuery.isLoading}
              unreadError={unreadQuery.isError}
              onRetryUnread={() => unreadQuery.refetch()}
            />
            <StatusPanel counts={data.bookings_by_status} refreshing={isFetching} />
          </div>

          <dl className={clsx(card, 'grid grid-cols-1 divide-y divide-slate-200 dark:divide-slate-800 sm:grid-cols-3 sm:divide-x sm:divide-y-0')}>
            <Kpi label="Pendapatan dari booking selesai" value={formatRp(toNumber(data.total_revenue))} />
            <Kpi label="Pelanggan terdaftar" value={nf.format(data.total_customers)} />
            <Kpi label="Kendaraan terdaftar" value={nf.format(data.total_vehicles)} />
          </dl>

          <div className="grid gap-4 xl:grid-cols-5">
            <RecentBookings rows={data.recent_bookings ?? []} />
            <TopServices rows={data.top_services ?? []} />
          </div>
        </>
      )}
    </div>
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
    <section aria-labelledby="todo-title" className={card}>
      <div className={cardHead}>
        <h2 id="todo-title" className={h2}>Perlu ditindak</h2>
      </div>
      <ul className="divide-y divide-slate-200 dark:divide-slate-800">
        <li>
          <Link
            href="/admin/bookings?status=menunggu"
            className="flex min-h-[72px] items-center gap-4 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
          >
            <CalendarClock className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
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
              <Headphones className="h-5 w-5 shrink-0 text-primary-600 dark:text-primary-500" aria-hidden />
              <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">Chat pelanggan belum dibalas</span>
              {unreadLoading ? (
                <SkeletonBlock className="h-7 w-8" />
              ) : (
                <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{nf.format(unread ?? 0)}</span>
              )}
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            </Link>
          )}
        </li>
      </ul>
    </section>
  );
}

function StatusPanel({ counts, refreshing }: { counts: Record<BookingStatus, number>; refreshing: boolean }) {
  const total = STATUS_ORDER.reduce((s, x) => s + (counts?.[x.key] ?? 0), 0);
  return (
    <section aria-labelledby="status-title" className={clsx(card, 'lg:col-span-2')}>
      <div className={cardHead}>
        <h2 id="status-title" className={h2}>Booking per status</h2>
        <span className="text-[13px] text-slate-600 dark:text-slate-400" aria-live="polite">
          {refreshing ? 'Memperbarui...' : `${nf.format(total)} booking total`}
        </span>
      </div>
      <div className="space-y-5 p-5">
        {total > 0 ? (
          <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden>
            {STATUS_ORDER.map(({ key, bar }) => {
              const n = counts?.[key] ?? 0;
              return n > 0 ? <div key={key} className={bar} style={{ width: `${(n / total) * 100}%` }} /> : null;
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-400">Belum ada booking yang tercatat.</p>
        )}
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STATUS_ORDER.map(({ key, label, bar }) => {
            const n = counts?.[key] ?? 0;
            const pct = total ? Math.round((n / total) * 100) : 0;
            return (
              <li key={key}>
                <Link
                  href={`/admin/bookings?status=${key}`}
                  className="block min-h-[44px] rounded-ctl border border-slate-200 px-3 py-2.5 hover:border-primary-600 hover:bg-primary-50/50 dark:border-slate-800 dark:hover:border-primary-500 dark:hover:bg-primary-900/20 transition-colors"
                >
                  <span className="flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-400">
                    <span className={clsx('h-2.5 w-2.5 shrink-0 rounded-full', bar)} aria-hidden />
                    {label}
                  </span>
                  <span className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{nf.format(n)}</span>
                    <span className="text-[13px] tabular-nums text-slate-600 dark:text-slate-400">{pct}%</span>
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

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-4">
      <dt className="text-[13px] text-slate-600 dark:text-slate-400">{label}</dt>
      <dd className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-white">{value}</dd>
    </div>
  );
}

function RecentBookings({ rows }: { rows: Summary['recent_bookings'] }) {
  return (
    <section aria-labelledby="recent-title" className={clsx(card, 'min-w-0 xl:col-span-3')}>
      <div className={cardHead}>
        <h2 id="recent-title" className={h2}>Booking terbaru masuk</h2>
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
                  <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">{b.customer.full_name}</span>
                  <span className="block truncate text-[13px] text-slate-600 dark:text-slate-400">
                    <span className="font-mono">{bookingCode(b.id)}</span> · {b.vehicle.brand} {b.vehicle.model}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 sm:hidden">
                    <StatusBadge status={b.status} size="sm" />
                    <span className="text-[13px] tabular-nums text-slate-600 dark:text-slate-400">{adminSchedule(b.scheduled_at)}</span>
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
  const max = Math.max(1, ...rows.map((r) => r.total_bookings));
  return (
    <section aria-labelledby="top-title" className={clsx(card, 'min-w-0 xl:col-span-2')}>
      <div className={cardHead}>
        <h2 id="top-title" className={h2}>Layanan paling sering dipesan</h2>
      </div>
      {rows.length === 0 ? (
        <div className="p-5">
          <EmptyState title="Belum ada data layanan" description="Muncul setelah ada booking dengan layanan." />
        </div>
      ) : (
        <ol className="space-y-4 p-5">
          {rows.map((s, i) => (
            <li key={s.service_id ?? i} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium text-slate-900 dark:text-white">
                  <span className="mr-2 tabular-nums text-slate-500 dark:text-slate-400">{i + 1}</span>
                  {s.name}
                </span>
                <span className="shrink-0 tabular-nums text-slate-900 dark:text-white">
                  {nf.format(s.total_bookings)}x
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden>
                <div className="h-1.5 rounded-full bg-primary-600" style={{ width: `${(s.total_bookings / max) * 100}%` }} />
              </div>
              <p className="text-[13px] tabular-nums text-slate-600 dark:text-slate-400">
                {formatRp(toNumber(s.total_revenue))} dari harga saat booking
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-label="Memuat ringkasan" role="status">
      <div className="grid gap-4 lg:grid-cols-3">
        <SkeletonBlock className="h-[190px] rounded-2xl" />
        <SkeletonBlock className="h-[190px] rounded-2xl lg:col-span-2" />
      </div>
      <SkeletonBlock className="h-[84px] rounded-2xl" />
      <div className="grid gap-4 xl:grid-cols-5">
        <SkeletonBlock className="h-[340px] rounded-2xl xl:col-span-3" />
        <SkeletonBlock className="h-[340px] rounded-2xl xl:col-span-2" />
      </div>
    </div>
  );
}
