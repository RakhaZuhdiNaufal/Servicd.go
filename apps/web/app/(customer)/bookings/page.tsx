'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { CalendarDays, ChevronRight, ClipboardList, MapPin } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { StatusBadge } from '@/components/status-badge';
import { Plate } from '@/components/customer/plate';
import { EmptyState, ErrorState, SkeletonBlock } from '@/components/customer/states';
import { bookingCode, formatDate, formatRp, formatTime, shortBranchName } from '@/lib/format';
import { card, h1, lead, pageStack } from '@/components/customer/ui';

type BookingStatus = 'menunggu' | 'dikonfirmasi' | 'diproses' | 'selesai' | 'dibatalkan';

interface Booking {
  id: string;
  status: BookingStatus;
  scheduled_at: string;
  estimated_cost: number | string;
  final_cost: number | string | null;
  vehicle: { plate_number: string; brand: string; model: string };
  booking_services: Array<{ service: { name: string } }>;
  branch: { name: string } | null;
  mechanic: { full_name: string } | null;
}

function isActive(b: Booking) {
  return b.status === 'menunggu' || b.status === 'dikonfirmasi' || b.status === 'diproses';
}

function activeSentence(b: Booking) {
  const where = b.branch ? ` di ${shortBranchName(b.branch.name)}` : '';
  if (b.status === 'diproses') return `Kendaraan kamu sedang dikerjakan${where}.`;
  if (b.status === 'dikonfirmasi') return `Booking sudah dikonfirmasi${where}. Datang sesuai jadwal ya.`;
  return `Menunggu konfirmasi bengkel${where}.`;
}

function serviceNames(b: Booking) {
  return b.booking_services.map((s) => s.service.name).join(', ');
}

const PROGRESS: Array<{ status: BookingStatus; label: string }> = [
  { status: 'menunggu', label: 'Diterima' },
  { status: 'dikonfirmasi', label: 'Dikonfirmasi' },
  { status: 'diproses', label: 'Dikerjakan' },
  { status: 'selesai', label: 'Siap diambil' }
];

/** Kartu lebar untuk booking yang sedang berjalan. Isinya sengaja sedikit: status, kendaraan, jadwal, tahap. */
function ActiveBookingCard({ b }: { b: Booking }) {
  const idx = PROGRESS.findIndex((p) => p.status === b.status);
  return (
    <Link
      href={`/bookings/${b.id}`}
      aria-label={`Booking ${bookingCode(b.id)}, ${activeSentence(b)} Lihat detail.`}
      className={clsx(
        card,
        'group block p-5 transition-colors hover:border-slate-400 sm:p-6 dark:hover:border-slate-500'
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <StatusBadge status={b.status} size="sm" />
          <span className="font-mono text-[13px] text-slate-500 dark:text-slate-400">{bookingCode(b.id)}</span>
        </div>
        {/* Kartunya sendiri sudah jadi tautan; di layar kecil teks ini cuma menambah baris. */}
        <span className="hidden items-center gap-1 text-[14px] font-semibold text-slate-900 group-hover:underline sm:inline-flex dark:text-white">
          Lihat detail
          <ChevronRight className="h-4 w-4" aria-hidden />
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-slate-600 dark:text-slate-400">
        <Plate number={b.vehicle.plate_number} size="md" />
        <span className="font-semibold capitalize text-slate-900 dark:text-white">
          {b.vehicle.brand} {b.vehicle.model}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4" aria-hidden />
          {formatDate(b.scheduled_at)}, {formatTime(b.scheduled_at)}
        </span>
        {b.branch && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4" aria-hidden />
            {shortBranchName(b.branch.name)}
          </span>
        )}
      </div>

      <ol className="mt-5 grid max-w-xl grid-cols-4 gap-2" aria-label="Tahap servis">
        {PROGRESS.map((p, i) => (
          <li key={p.status} className="space-y-1.5" aria-current={i === idx ? 'step' : undefined}>
            <span
              aria-hidden
              className={clsx('block h-1.5 rounded', i <= idx ? 'bg-accent-500' : 'bg-slate-200 dark:bg-slate-700')}
            />
            <span
              className={clsx(
                'block text-[11px] leading-tight sm:text-[13px]',
                i === idx
                  ? 'font-semibold text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400'
              )}
            >
              {p.label}
            </span>
          </li>
        ))}
      </ol>
    </Link>
  );
}

function BookingCard({ b }: { b: Booking }) {
  const cost = b.final_cost ?? b.estimated_cost;
  return (
    <Link
      href={`/bookings/${b.id}`}
      aria-label={`Booking ${bookingCode(b.id)}, ${b.vehicle.plate_number}, lihat detail`}
      className={clsx(
        card,
        'flex h-full flex-col gap-3.5 p-5 transition-colors hover:border-slate-400 sm:p-6 dark:hover:border-slate-500'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[13px] text-slate-600 dark:text-slate-400">{bookingCode(b.id)}</span>
        <StatusBadge status={b.status} size="sm" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Plate number={b.vehicle.plate_number} size="md" />
        <span className="text-[15px] font-semibold capitalize text-slate-900 dark:text-white">
          {b.vehicle.brand} {b.vehicle.model}
        </span>
      </div>
      {b.booking_services.length > 0 && (
        <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{serviceNames(b)}</p>
      )}
      <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-1 border-t border-slate-200 pt-3.5 text-[13px] dark:border-slate-800">
        <div className="space-y-0.5 text-slate-600 dark:text-slate-400">
          <p>
            {formatDate(b.scheduled_at)}, {formatTime(b.scheduled_at)}
          </p>
          {b.branch && (
            <p className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {shortBranchName(b.branch.name)}
            </p>
          )}
        </div>
        <p className="text-lg font-bold text-slate-900 dark:text-white">{formatRp(cost)}</p>
      </div>
    </Link>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Memuat riwayat booking">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-[20px] border border-slate-200 p-5 dark:border-slate-800 sm:p-6">
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="h-5 w-2/3" />
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export default function BookingsPage() {
  const { data: allBookings = [], isLoading, isError, error, refetch } = useQuery<Booking[]>({
    queryKey: ['bookings'],
    queryFn: () => fetcher('/bookings')
  });

  // Riwayat penuh: booking yang masih berjalan naik ke atas, sisanya jadi daftar di bawah.
  const running = allBookings.filter(isActive);
  const rest = allBookings.filter((b) => !isActive(b));

  return (
    <div className={pageStack}>
      <div className="space-y-6 pt-2 sm:pt-4">
        <div className="max-w-2xl space-y-2">
          <h1 className={h1}>Riwayat booking</h1>
          <p className={lead}>Semua booking servis kamu, dari yang terbaru. Ketuk salah satu untuk lihat rinciannya.</p>
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorState
          title="Riwayat booking belum bisa dimuat"
          message={(error as Error)?.message}
          onRetry={() => refetch()}
        />
      ) : allBookings.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Belum ada booking"
          description="Booking servis pertamamu akan muncul di sini, lengkap dengan statusnya."
          action={{ label: 'Buat booking pertama', href: '/booking/new' }}
        />
      ) : (
        <>
          {running.length > 0 && (
            <section aria-labelledby="sedang-berjalan" className="space-y-4">
              <h2
                id="sedang-berjalan"
                className="text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400"
              >
                Sedang berjalan
              </h2>
              <div className="space-y-3">
                {running.map((b) => (
                  <ActiveBookingCard key={b.id} b={b} />
                ))}
              </div>
            </section>
          )}

          {rest.length > 0 && (
            <section aria-labelledby="daftar-booking" className="space-y-4">
              <h2
                id="daftar-booking"
                className="text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400"
              >
                {running.length > 0 ? 'Sebelumnya' : 'Semua booking'}
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((b) => (
                  <li key={b.id}>
                    <BookingCard b={b} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
