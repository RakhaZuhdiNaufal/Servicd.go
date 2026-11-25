'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  Calendar,
  PlayCircle,
  Search,
  Phone,
  MessageSquare,
  Car,
  Table2,
  LayoutGrid,
  X,
  RefreshCw,
  Eye,
  Camera,
  Star,
  Receipt,
  AlertCircle
} from 'lucide-react';
import { clsx } from 'clsx';
import { fetcher } from '@/lib/fetcher';
import { bookingCode, formatRp } from '@/lib/format';
import { Plate } from '@/components/customer/plate';
import { StatusBadge } from '@/components/status-badge';
import {
  AdminPageHeader,
  btnSecondary,
  btnRow,
  inputCls,
  TableCard,
  Th,
  Td,
  theadCls,
  tbodyCls,
  TableSkeleton
} from '@/components/admin/resource-ui';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { adminSchedule, toNumber } from '@/components/admin/format';

interface CompletedBooking {
  id: string;
  status: 'selesai';
  scheduled_at: string;
  complaint_notes: string | null;
  estimated_cost: number | string;
  final_cost?: number | string | null;
  created_at: string;
  updated_at: string;
  customer: {
    id: string;
    full_name: string;
    phone: string;
    email: string;
  };
  vehicle: {
    id: string;
    plate_number: string;
    brand: string;
    model: string;
    vehicle_type: string;
    year?: number | null;
  };
  branch?: {
    id: string;
    name: string;
    address?: string | null;
  } | null;
  mechanic: {
    id: string;
    full_name: string;
    specialty?: string | null;
  } | null;
  photos?: Array<{
    id: string;
    photo_url: string;
    stage: 'checkin' | 'checkout';
    caption: string | null;
    uploaded_at: string;
  }>;
  booking_services: Array<{
    price_at_booking?: number | string;
    service: {
      name: string;
      price: number | string;
      duration_minutes?: number | null;
    };
  }>;
  payments?: Array<{
    id: string;
    amount: number | string;
    payment_type: 'dp' | 'pelunasan';
    method: string;
    status: 'pending' | 'paid' | 'failed';
    paid_at: string | null;
  }>;
  review?: {
    rating: number;
    comment: string | null;
    created_at: string;
  } | null;
  status_history?: Array<{
    id: string;
    changed_at: string;
    status: string;
    note: string | null;
    changer: {
      id: string;
      full_name: string;
    } | null;
  }>;
}

interface CompletedListResponse {
  bookings: CompletedBooking[];
  meta: { total: number; page: number; limit: number; total_pages: number };
}

function ServisSelesaiContent() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [detailBooking, setDetailBooking] = useState<CompletedBooking | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const queryParams = new URLSearchParams({
    status: 'selesai',
    page: String(page),
    limit: '50',
    ...(search ? { search } : {}),
    ...(startDate ? { start_date: startDate } : {}),
    ...(endDate ? { end_date: endDate } : {})
  });

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<CompletedListResponse>({
    queryKey: ['admin-completed-services', page, search, startDate, endDate],
    queryFn: () => fetcher(`/admin/bookings?${queryParams.toString()}`)
  });

  const bookings = data?.bookings ?? [];
  const totalCompleted = data?.meta.total ?? 0;

  // Telemetry Aggregates
  const totalRevenue = useMemo(() => {
    return bookings.reduce((sum, b) => sum + toNumber(b.final_cost ?? b.estimated_cost), 0);
  }, [bookings]);

  const avgCost = useMemo(() => {
    if (bookings.length === 0) return 0;
    return Math.round(totalRevenue / bookings.length);
  }, [totalRevenue, bookings.length]);

  const hasFilter = !!(search || startDate || endDate);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Riwayat Servis Selesai</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Tuntas ({totalCompleted})
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Daftar seluruh kendaraan yang telah menyelesaikan pengerjaan servis di bengkel beserta rincian biaya akhir dan pembayaran.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className={clsx(btnSecondary, 'h-10 text-xs sm:text-sm')}
            title="Segarkan data servis selesai"
          >
            <RefreshCw className={clsx('h-4 w-4', isFetching && 'animate-spin text-primary-600')} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>
        </div>
      </div>

      {/* 3 Tab Switcher: Booking vs On Progress vs Servis Selesai */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <Link
          href="/admin/bookings"
          className="inline-flex items-center gap-2 border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-white transition-colors"
        >
          <Calendar className="h-4 w-4" />
          Semua Booking & Jadwal
        </Link>
        <Link
          href="/admin/on-progress"
          className="group inline-flex items-center gap-2 border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-white transition-colors"
        >
          <PlayCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>Servis On Progress</span>
        </Link>
        <Link
          href="/admin/servis-selesai"
          className="group inline-flex items-center gap-2 border-b-2 border-primary-600 px-4 py-2.5 text-sm font-semibold text-primary-600 dark:border-primary-400 dark:text-primary-400"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>Servis Selesai</span>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
            {totalCompleted}
          </span>
        </Link>
      </div>

      {/* 3 Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Unit Diservis
          </span>
          <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
            {totalCompleted}
          </p>
          <p className="mt-1 text-xs text-slate-500">Kendaraan selesai dikerjakan</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Total Pendapatan Selesai
          </span>
          <p className="mt-2 text-3xl font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums">
            {formatRp(totalRevenue)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Dari {bookings.length} servis pada halaman ini</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Rata-rata Biaya Servis
          </span>
          <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {formatRp(avgCost)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Nilai rata-rata per transaksi servis</p>
        </div>
      </div>

      {/* Filter and View Controls Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-[240px] flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari plat nomor, nama pelanggan, mobil..."
            className={clsx(inputCls, 'h-10 pl-9 text-xs')}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <span>Dari:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-ctl border border-slate-300 bg-white px-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            <span>Sampai:</span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-ctl border border-slate-300 bg-white px-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {hasFilter && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setSearch('');
                setStartDate('');
                setEndDate('');
                setPage(1);
              }}
              className={clsx(btnSecondary, 'h-9 text-xs')}
            >
              Reset
            </button>
          )}

          {/* View Mode Toggle */}
          <div
            role="group"
            aria-label="Mode Tampilan"
            className="inline-flex rounded-ctl border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-950"
          >
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              aria-pressed={viewMode === 'cards'}
              title="Tampilan Kartu"
              className={clsx(
                'inline-flex h-8 w-8 items-center justify-center rounded-chip transition-colors',
                viewMode === 'cards'
                  ? 'bg-white text-primary-600 shadow-sm dark:bg-slate-900 dark:text-primary-400'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-pressed={viewMode === 'table'}
              title="Tampilan Tabel"
              className={clsx(
                'inline-flex h-8 w-8 items-center justify-center rounded-chip transition-colors',
                viewMode === 'table'
                  ? 'bg-white text-primary-600 shadow-sm dark:bg-slate-900 dark:text-primary-400'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              )}
            >
              <Table2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        viewMode === 'cards' ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
              />
            ))}
          </div>
        ) : (
          <TableSkeleton rows={6} cols={6} />
        )
      ) : isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
          <p className="mt-2 text-sm font-semibold">Gagal memuat riwayat servis selesai</p>
          <p className="text-xs text-red-600 dark:text-red-400">{(error as Error)?.message || 'Terjadi kesalahan sistem'}</p>
          <button type="button" onClick={() => refetch()} className={clsx(btnSecondary, 'mt-4 h-9 text-xs')}>
            Coba lagi
          </button>
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            <Car className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
            Belum ada riwayat servis yang selesai
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {hasFilter ? 'Tidak ada data servis yang sesuai dengan filter pencarian.' : 'Kendaraan yang selesai servis akan otomatis tercatat di sini.'}
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        /* CARDS GRID */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bookings.map((b) => {
            const cleanPhone = b.customer.phone.replace(/\D/g, '').replace(/^0/, '62');
            const totalPaid = (b.payments ?? [])
              .filter((p) => p.status === 'paid')
              .reduce((sum, p) => sum + toNumber(p.amount), 0);
            const finalCost = toNumber(b.final_cost ?? b.estimated_cost);
            const change = totalPaid - finalCost;

            return (
              <div
                key={b.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Plate number={b.vehicle.plate_number} />
                      <p className="mt-1.5 text-sm font-bold text-slate-900 dark:text-white">
                        {b.vehicle.brand} {b.vehicle.model}{' '}
                        {b.vehicle.year ? <span className="text-xs font-normal text-slate-500">({b.vehicle.year})</span> : null}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" />
                        Selesai
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">{bookingCode(b.id)}</span>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="mt-3.5 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800/50">
                    <div className="min-w-0 pr-2">
                      <p className="truncate font-semibold text-slate-800 dark:text-slate-200">{b.customer.full_name}</p>
                      <p className="text-[11px] text-slate-500">{b.customer.phone}</p>
                    </div>
                    {b.customer.phone && (
                      <a
                        href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                          `Halo ${b.customer.full_name}, kami dari tim bengkel ServiceGo mengonfirmasi bahwa servis kendaraan ${b.vehicle.brand} ${b.vehicle.model} (${b.vehicle.plate_number}) telah selesai.`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Hubungi Pelanggan via WhatsApp"
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300"
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>

                  {/* Mechanic & Schedule */}
                  <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Mekanik:</span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {b.mechanic?.full_name || 'Tidak tercatat'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Jadwal Selesai:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {adminSchedule(b.updated_at || b.scheduled_at)}
                      </span>
                    </div>
                  </div>

                  {/* Financial Breakdown (Estimasi, Biaya Akhir, Total Dibayar, Kembalian) */}
                  <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40 space-y-1.5">
                    <div className="flex justify-between text-slate-500">
                      <span>Estimasi Total:</span>
                      <span className="tabular-nums">{formatRp(toNumber(b.estimated_cost))}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                      <span>Biaya Akhir:</span>
                      <span className="text-primary-600 dark:text-primary-400 tabular-nums">
                        {formatRp(finalCost)}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold text-emerald-700 dark:text-emerald-400">
                      <span>Total Dibayar:</span>
                      <span className="tabular-nums">{formatRp(totalPaid)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700 font-semibold">
                      <span>Kembalian:</span>
                      <span className={clsx('tabular-nums', change > 0 ? 'text-emerald-600' : 'text-slate-500')}>
                        {change > 0 ? formatRp(change) : change < 0 ? `Kurang ${formatRp(Math.abs(change))}` : 'Rp 0 (Pas)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setDetailBooking(b)}
                    className={clsx(btnSecondary, 'w-full h-9 text-xs font-semibold')}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Lihat Detail Servis
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <TableCard>
          <table className="w-full text-left text-xs">
            <thead className={theadCls}>
              <tr>
                <Th>Kendaraan & Plat</Th>
                <Th>Pelanggan</Th>
                <Th>Mekanik</Th>
                <Th>Waktu Selesai</Th>
                <Th align="right">Biaya Akhir</Th>
                <Th align="right">Total Dibayar</Th>
                <Th align="right">Kembalian</Th>
                <Th align="right">Aksi</Th>
              </tr>
            </thead>
            <tbody className={tbodyCls}>
              {bookings.map((b) => {
                const totalPaid = (b.payments ?? [])
                  .filter((p) => p.status === 'paid')
                  .reduce((sum, p) => sum + toNumber(p.amount), 0);
                const finalCost = toNumber(b.final_cost ?? b.estimated_cost);
                const change = totalPaid - finalCost;

                return (
                  <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <Td>
                      <div className="flex flex-col gap-1">
                        <Plate number={b.vehicle.plate_number} />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {b.vehicle.brand} {b.vehicle.model}
                        </span>
                      </div>
                    </Td>

                    <Td>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900 dark:text-white">{b.customer.full_name}</span>
                        <span className="text-slate-500 text-[11px]">{b.customer.phone}</span>
                      </div>
                    </Td>

                    <Td>
                      <span className="text-slate-700 dark:text-slate-300">
                        {b.mechanic?.full_name || '-'}
                      </span>
                    </Td>

                    <Td>
                      <span className="text-slate-600 dark:text-slate-400">
                        {adminSchedule(b.updated_at || b.scheduled_at)}
                      </span>
                    </Td>

                    <Td align="right">
                      <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                        {formatRp(finalCost)}
                      </span>
                    </Td>

                    <Td align="right">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatRp(totalPaid)}
                      </span>
                    </Td>

                    <Td align="right">
                      <span className="tabular-nums font-medium text-slate-600 dark:text-slate-400">
                        {change > 0 ? formatRp(change) : change < 0 ? `Kurang ${formatRp(Math.abs(change))}` : 'Rp 0'}
                      </span>
                    </Td>

                    <Td align="right">
                      <button
                        type="button"
                        onClick={() => setDetailBooking(b)}
                        className={clsx(btnRow, 'h-8 px-2 text-xs')}
                      >
                        Detail Servis
                      </button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableCard>
      )}

      {/* DETAIL SERVIS SHEET (TANPA TOMBOL CATAT PEMBAYARAN) */}
      <Sheet open={!!detailBooking} onOpenChange={(open) => !open && setDetailBooking(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-6">
          {detailBooking && (
            <div className="space-y-6">
              <div className="border-b border-slate-200 pb-4 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-slate-500">{bookingCode(detailBooking.id)}</span>
                  <StatusBadge status="selesai" />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <SheetTitle className="text-lg font-bold text-slate-900 dark:text-white">
                    Detail Servis
                  </SheetTitle>
                  <Plate number={detailBooking.vehicle.plate_number} />
                </div>
                <SheetDescription className="mt-1 text-xs text-slate-500">
                  {detailBooking.vehicle.brand} {detailBooking.vehicle.model} • Selesai: {adminSchedule(detailBooking.updated_at || detailBooking.scheduled_at)}
                </SheetDescription>
              </div>

              {/* Customer Info */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pemilik Kendaraan</p>
                <p className="mt-1 font-bold text-slate-900 dark:text-white">{detailBooking.customer.full_name}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">{detailBooking.customer.phone}</p>
                <p className="text-xs text-slate-500">{detailBooking.customer.email}</p>

                {detailBooking.customer.phone && (
                  <div className="mt-3">
                    <a
                      href={`https://wa.me/${detailBooking.customer.phone.replace(/\D/g, '').replace(/^0/, '62')}`}
                      target="_blank"
                      rel="noreferrer"
                      className={clsx(btnSecondary, 'h-8 w-full text-xs')}
                    >
                      <Phone className="h-3 w-3 text-emerald-600" />
                      Chat WhatsApp Pelanggan
                    </a>
                  </div>
                )}
              </div>

              {/* Mechanic Info */}
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Teknisi / Mekanik</p>
                <p className="mt-1 font-bold text-slate-900 dark:text-white">
                  {detailBooking.mechanic?.full_name || 'Tidak tercatat'}
                </p>
                {detailBooking.mechanic?.specialty && (
                  <p className="text-xs text-slate-500">{detailBooking.mechanic.specialty}</p>
                )}
              </div>

              {/* Paket Servis & Rincian Pembayaran */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Layanan yang Dikerjakan</p>
                <div className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                  {detailBooking.booking_services.map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 text-xs">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{s.service.name}</p>
                        {s.service.duration_minutes && (
                          <p className="text-[11px] text-slate-500">{s.service.duration_minutes} menit</p>
                        )}
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {formatRp(toNumber(s.price_at_booking ?? s.service.price))}
                      </span>
                    </div>
                  ))}

                  {/* Financial Summary */}
                  <div className="bg-slate-50 p-3 text-xs space-y-1.5 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>Estimasi Total:</span>
                      <span className="tabular-nums">{formatRp(toNumber(detailBooking.estimated_cost))}</span>
                    </div>
                    <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                      <span>Biaya Akhir:</span>
                      <span className="text-primary-600 dark:text-primary-400 tabular-nums">
                        {formatRp(toNumber(detailBooking.final_cost ?? detailBooking.estimated_cost))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-semibold text-emerald-600 dark:text-emerald-400 pt-1 border-t border-slate-200 dark:border-slate-700">
                      <span>Total Dibayar:</span>
                      <span className="tabular-nums">
                        {formatRp(
                          (detailBooking.payments ?? [])
                            .filter((p) => p.status === 'paid')
                            .reduce((sum, p) => sum + toNumber(p.amount), 0)
                        )}
                      </span>
                    </div>

                    {(() => {
                      const totalPaid = (detailBooking.payments ?? [])
                        .filter((p) => p.status === 'paid')
                        .reduce((sum, p) => sum + toNumber(p.amount), 0);
                      const finalCost = toNumber(detailBooking.final_cost ?? detailBooking.estimated_cost);
                      const change = totalPaid - finalCost;
                      if (change > 0) {
                        return (
                          <div className="flex items-center justify-between rounded-lg bg-emerald-100/70 px-2 py-1 font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            <span>Kembalian:</span>
                            <span>{formatRp(change)}</span>
                          </div>
                        );
                      }
                      if (change < 0) {
                        return (
                          <div className="flex items-center justify-between rounded-lg bg-amber-100/70 px-2 py-1 font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            <span>Sisa Belum Lunas:</span>
                            <span>{formatRp(Math.abs(change))}</span>
                          </div>
                        );
                      }
                      return (
                        <div className="flex items-center justify-between text-slate-500 pt-0.5">
                          <span>Kembalian:</span>
                          <span>Rp 0 (Lunas Pas)</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Documentation Photos */}
              {detailBooking.photos && detailBooking.photos.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Dokumentasi Foto Servis</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {detailBooking.photos.map((p) => (
                      <a
                        key={p.id}
                        href={p.photo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800"
                      >
                        <img
                          src={p.photo_url}
                          alt={p.caption || ''}
                          className="h-28 w-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-slate-950/70 p-1.5 text-[10px] text-white">
                          <span className="font-bold uppercase tracking-wider">{p.stage}</span>
                          {p.caption && <p className="truncate text-slate-300">{p.caption}</p>}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Customer Review if any */}
              {detailBooking.review && (
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ulasan Pelanggan</p>
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="h-4 w-4 fill-amber-500" />
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {detailBooking.review.rating}/5
                      </span>
                    </div>
                  </div>
                  {detailBooking.review.comment && (
                    <p className="mt-2 text-xs italic text-slate-700 dark:text-slate-300">
                      &ldquo;{detailBooking.review.comment}&rdquo;
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function ServisSelesaiPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={6} cols={6} />}>
      <ServisSelesaiContent />
    </Suspense>
  );
}
