'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { CalendarDays, ChevronRight, ClipboardList, MapPin } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { StatusBadge } from '@/components/status-badge';
import { Plate } from '@/components/customer/plate';
import { EmptyState, ErrorState, SkeletonBlock } from '@/components/customer/states';
import { bookingCode, formatDate, formatRp, formatTime, shortBranchName } from '@/lib/format';

type BookingStatus = 'menunggu' | 'diproses' | 'selesai' | 'dibatalkan';
type FilterStatus = 'semua' | BookingStatus;

// Bentuk data dari GET /api/v1/bookings (include vehicle, booking_services.service, mechanic, branch).
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

const FILTERS: { label: string; value: FilterStatus }[] = [
  { label: 'Semua', value: 'semua' },
  { label: 'Menunggu', value: 'menunggu' },
  { label: 'Dikerjakan', value: 'diproses' },
  { label: 'Selesai', value: 'selesai' },
  { label: 'Dibatalkan', value: 'dibatalkan' }
];

const EMPTY_TEXT: Record<BookingStatus, string> = {
  menunggu: 'Tidak ada booking yang menunggu konfirmasi.',
  diproses: 'Tidak ada kendaraan yang sedang dikerjakan.',
  selesai: 'Belum ada servis yang selesai.',
  dibatalkan: 'Tidak ada booking yang dibatalkan.'
};

function isActive(b: Booking) {
  return b.status === 'menunggu' || b.status === 'diproses';
}

function activeSentence(b: Booking) {
  const where = b.branch ? ` di ${shortBranchName(b.branch.name)}` : '';
  if (b.status === 'diproses') return `Kendaraan kamu sedang dikerjakan${where}.`;
  return `Menunggu konfirmasi bengkel${where}.`;
}

function serviceNames(b: Booking) {
  return b.booking_services.map((s) => s.service.name).join(', ');
}

const PROGRESS: Array<{ status: BookingStatus; label: string }> = [
  { status: 'menunggu', label: 'Diterima' },
  { status: 'diproses', label: 'Dikerjakan' },
  { status: 'selesai', label: 'Siap diambil' }
];

/**
 * Kartu lebar untuk booking yang sedang berjalan: panel gelap sebagai titik fokus halaman
 * (jeda ritme yang sama dengan panel gelap di landing). Status jadi informasi utama.
 */
function ActiveBookingCard({ b }: { b: Booking }) {
  const idx = PROGRESS.findIndex((p) => p.status === b.status);
  return (
    <Link
      href={`/bookings/${b.id}`}
      className="group block rounded-[28px] bg-slate-900 p-6 text-white transition-colors hover:bg-slate-800 dark:bg-slate-950 dark:ring-1 dark:ring-slate-800 dark:hover:bg-slate-900 sm:p-9"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-10">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <StatusBadge status={b.status} size="sm" />
            <span className="font-mono text-[13px] text-slate-300">{bookingCode(b.id)}</span>
          </div>
          <p className="text-[24px] font-extrabold leading-tight tracking-[-0.015em] sm:text-[32px]">{activeSentence(b)}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px] text-slate-300">
            <Plate number={b.vehicle.plate_number} size="md" className="dark:outline-slate-600" />
            <span className="font-semibold capitalize text-white">
              {b.vehicle.brand} {b.vehicle.model}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" aria-hidden />
              {formatDate(b.scheduled_at)}, {formatTime(b.scheduled_at)}
            </span>
          </div>
          <ol className="grid max-w-lg grid-cols-3 gap-2 pt-1" aria-label="Tahap servis">
            {PROGRESS.map((p, i) => (
              <li key={p.status} className="space-y-1.5" aria-current={i === idx ? 'step' : undefined}>
                <span
                  aria-hidden
                  className={clsx('block h-1.5 rounded', i <= idx ? 'bg-primary-500' : 'bg-slate-700')}
                />
                <span className={clsx('block text-[13px]', i === idx ? 'font-bold text-white' : 'text-slate-300')}>
                  {p.label}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <span className="inline-flex min-h-[52px] shrink-0 items-center justify-center gap-1.5 self-start rounded-ctl bg-white px-6 text-[17px] font-bold text-slate-900 transition-colors group-hover:bg-slate-100 lg:self-auto">
          Lihat detail booking
          <ChevronRight className="h-5 w-5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

function BookingCard({ b }: { b: Booking }) {
  const cost = b.final_cost ?? b.estimated_cost;
  return (
    <Link
      href={`/bookings/${b.id}`}
      aria-label={`Booking ${bookingCode(b.id)}, ${b.vehicle.plate_number}, lihat detail`}
      className="flex h-full flex-col gap-3.5 rounded-[20px] border border-slate-200 bg-white p-5 transition-colors hover:border-primary-600 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary-500 sm:p-6"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[13px] text-slate-600 dark:text-slate-400">{bookingCode(b.id)}</span>
        <StatusBadge status={b.status} size="sm" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Plate number={b.vehicle.plate_number} size="md" />
        <span className="text-[17px] font-bold capitalize text-slate-900 dark:text-white">
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
        <p className="text-lg font-extrabold text-slate-900 dark:text-white">{formatRp(cost)}</p>
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
  const [filter, setFilter] = useState<FilterStatus>('semua');

  const { data: allBookings = [], isLoading, isError, error, refetch } = useQuery<Booking[]>({
    queryKey: ['bookings'],
    queryFn: () => fetcher('/bookings')
  });

  const counts = useMemo(() => {
    const c: Record<FilterStatus, number> = { semua: allBookings.length, menunggu: 0, diproses: 0, selesai: 0, dibatalkan: 0 };
    allBookings.forEach((b) => {
      c[b.status] += 1;
    });
    return c;
  }, [allBookings]);

  const filtered = filter === 'semua' ? allBookings : allBookings.filter((b) => b.status === filter);
  // Di tab "Semua", booking yang masih berjalan dipisah ke atas sebagai kartu lebar.
  const running = filter === 'semua' ? filtered.filter(isActive) : [];
  const rest = filter === 'semua' ? filtered.filter((b) => !isActive(b)) : filtered;

  return (
    <div className="space-y-10 sm:space-y-12">
      <div className="space-y-6">
        <div>
          <div className="max-w-2xl space-y-3">
            <h1 className="text-[30px] font-extrabold leading-[1.1] tracking-[-0.015em] text-slate-900 dark:text-white sm:text-[40px]">
              Riwayat booking
            </h1>
            <p className="text-[17px] leading-relaxed text-slate-600 dark:text-slate-400">
              Semua booking servis kamu, dari yang terbaru. Ketuk salah satu untuk melihat status dan rinciannya.
            </p>
          </div>
        </div>

        {!isLoading && !isError && allBookings.length > 0 && (
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Saring menurut status">
            {FILTERS.map(({ label, value }) => {
              const on = filter === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFilter(value)}
                  className={clsx(
                    'inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-chip border px-4 text-[15px] font-semibold transition-colors',
                    on
                      ? 'border-primary-600 bg-primary-600 text-white'
                      : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800'
                  )}
                >
                  {label}
                  <span className={clsx('text-[13px]', on ? 'text-primary-100' : 'text-slate-500 dark:text-slate-400')}>
                    {counts[value]}
                  </span>
                </button>
              );
            })}
          </div>
        )}
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
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={EMPTY_TEXT[filter as BookingStatus]}
          action={{ label: 'Lihat semua booking', onClick: () => setFilter('semua') }}
        />
      ) : (
        <>
          {running.length > 0 && (
            <section aria-labelledby="sedang-berjalan" className="space-y-4">
              <h2 id="sedang-berjalan" className="text-[15px] font-bold text-primary-700 dark:text-primary-100">
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
              <h2 id="daftar-booking" className="text-[22px] font-extrabold tracking-[-0.01em] text-slate-900 dark:text-white sm:text-[24px]">
                {filter === 'semua' ? (running.length > 0 ? 'Sebelumnya' : 'Semua booking') : FILTERS.find((f) => f.value === filter)?.label}
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
