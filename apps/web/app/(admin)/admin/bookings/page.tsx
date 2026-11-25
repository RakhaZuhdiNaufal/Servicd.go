'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  LayoutGrid,
  Table2,
  ChevronLeft,
  ChevronRight,
  Camera,
  Upload,
  Search,
  X,
  Inbox,
  Phone,
  Mail,
  MapPin,
  CalendarClock,
  History,
  Wallet,
  Calendar,
  PlayCircle,
  CheckCircle2
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { clsx } from 'clsx';
import { BOOKING_STATUS_TRANSITIONS, bookingStatusBlockReason, isScheduleDayReached } from '@servicego/shared';
import { fetcher } from '@/lib/fetcher';
import { supabase } from '@/lib/supabase-client';
import { bookingCode, formatRp, shortBranchName } from '@/lib/format';
import { StatusBadge } from '@/components/status-badge';
import { Plate } from '@/components/customer/plate';
import { EmptyState, ErrorState, SkeletonBlock } from '@/components/customer/states';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { adminDate, adminSchedule, adminTime, toNumber } from '@/components/admin/format';
import { AdminDialog, btnDanger, btnSecondary } from '@/components/admin/resource-ui';

type BookingStatus = 'menunggu' | 'dikonfirmasi' | 'diproses' | 'selesai' | 'dibatalkan';

// Bentuk data dari GET /api/v1/admin/bookings (Prisma: Decimal dikirim sebagai string)
interface Booking {
  id: string;
  status: BookingStatus;
  scheduled_at: string;
  complaint_notes: string | null;
  estimated_cost: number | string;
  final_cost?: number | string | null;
  customer: { id: string; full_name: string; phone: string; email: string };
  vehicle: { plate_number: string; brand: string; model: string; vehicle_type: string; year?: number };
  branch?: { id: string; name: string } | null;
  mechanic: { id: string; full_name: string; specialty?: string } | null;
  photos?: Array<{ id: string; photo_url: string; stage: 'checkin' | 'checkout'; caption: string | null }>;
  booking_services: Array<{ price_at_booking?: number | string; service: { name: string; price: number | string } }>;
  payments?: Array<{ id: string; amount: number | string; payment_type: 'dp' | 'pelunasan'; status: 'pending' | 'paid' | 'failed' }>;
}

// Bentuk data dari GET /api/v1/admin/bookings/:id (detail lengkap + riwayat status)
interface StatusHistoryEntry {
  id: string;
  status: BookingStatus;
  note: string | null;
  changed_at: string;
  changer: { id: string; full_name: string; role: 'admin' | 'customer' } | null;
}

interface BookingDetail extends Booking {
  branch?: { id: string; name: string; address?: string; phone?: string } | null;
  status_history: StatusHistoryEntry[];
}

interface ListResponse {
  bookings: Booking[];
  meta: { total: number; page: number; limit: number; total_pages: number };
}

interface Mechanic {
  id: string;
  full_name: string;
  specialty: string;
  active_jobs_count: number;
}

const STATUSES: Array<{ id: BookingStatus; label: string }> = [
  { id: 'menunggu', label: 'Menunggu' },
  { id: 'dikonfirmasi', label: 'Dikonfirmasi' },
  { id: 'diproses', label: 'Diproses' },
  { id: 'selesai', label: 'Selesai' },
  { id: 'dibatalkan', label: 'Dibatalkan' }
];
const KANBAN_COLS = STATUSES.filter((s) => s.id !== 'dibatalkan');
const STATUS_DOT: Record<BookingStatus, string> = {
  menunggu: 'bg-amber-500',
  dikonfirmasi: 'bg-sky-500',
  diproses: 'bg-primary-600',
  selesai: 'bg-green-600',
  dibatalkan: 'bg-red-600'
};

const PAGE_SIZE = 50;

const field =
  'h-11 w-full rounded-ctl border border-slate-300 bg-white px-3 text-sm text-slate-900 [color-scheme:light] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:[color-scheme:dark]';
const fieldLabel = 'mb-1 block text-[13px] font-medium text-slate-700 dark:text-slate-300';
const sectionTitle = 'text-[13px] font-semibold text-slate-900 dark:text-white';

function isStatus(v: string | null): v is BookingStatus {
  return !!v && STATUSES.some((s) => s.id === v);
}

function servicesText(b: Booking) {
  return b.booking_services.map((s) => s.service.name).join(', ') || 'Tanpa layanan';
}

function BookingsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState(() => {
    const s = searchParams.get('status');
    return isStatus(s) ? s : '';
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [detailId, setDetailId] = useState<string | null>(searchParams.get('id'));

  // Parameter URL (dari Dashboard atau pencarian Ctrl+K) mengatur filter dan detail yang terbuka
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) setDetailId(id);
    const s = searchParams.get('status');
    if (isStatus(s)) {
      setStatusFilter(s);
      setPage(1);
    }
    const q = searchParams.get('search');
    if (q !== null) {
      setSearchInput(q);
      setSearch(q);
      setPage(1);
    }
  }, [searchParams]);

  // Pencarian ditunda sebentar supaya tidak memanggil API di setiap ketikan
  useEffect(() => {
    const t = setTimeout(() => {
      const v = searchInput.trim();
      if (v !== search) {
        setSearch(v);
        setPage(1);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, search]);

  const qParams = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(startDate ? { start_date: startDate } : {}),
    ...(endDate ? { end_date: endDate } : {}),
    ...(search ? { search } : {})
  });

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<ListResponse>({
    queryKey: ['admin-bookings', page, statusFilter, startDate, endDate, search],
    queryFn: () => fetcher(`/admin/bookings?${qParams}`)
  });

  const bookings = data?.bookings ?? [];

  // Detail diambil dari endpoint sendiri, jadi booking di luar halaman daftar (link Dashboard / Ctrl+K) tetap bisa dibuka.
  // Selama memuat, data dari baris daftar dipakai dulu supaya panel langsung terisi.
  const detailQuery = useQuery<BookingDetail>({
    queryKey: ['admin-booking', detailId],
    queryFn: () => fetcher(`/admin/bookings/${detailId}`),
    enabled: !!detailId
  });
  const listBooking = bookings.find((b) => b.id === detailId) ?? null;
  const detailBooking: Booking | null = detailQuery.data ?? listBooking;
  const statusHistory = detailQuery.data?.status_history ?? null;
  const hasFilter = !!(statusFilter || startDate || endDate || search);

  function closeDetail() {
    setDetailId(null);
    if (searchParams.get('id')) {
      const next = new URLSearchParams(searchParams.toString());
      next.delete('id');
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }

  function resetFilters() {
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
    setSearchInput('');
    setSearch('');
    setPage(1);
    if (searchParams.toString()) router.replace(pathname, { scroll: false });
  }

  // Ubah status (dipakai tombol di sheet dan drag di kanban)
  const statusMutation = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: BookingStatus; note?: string }) =>
      fetcher(`/admin/bookings/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, note })
      }),
    onSuccess: () => {
      toast.success('Status booking diperbarui');
      setStatusNote('');
      qc.invalidateQueries({ queryKey: ['admin-bookings'] });
      qc.invalidateQueries({ queryKey: ['admin-booking'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (e: Error) => toast.error(e.message)
  });
  const [statusNote, setStatusNote] = useState('');

  // Daftar mekanik aktif untuk penugasan
  const mechanicsQuery = useQuery<Mechanic[]>({
    // Key beda dari halaman Mekanik (yang memuat semua, termasuk nonaktif); prefix sama agar invalidasi tetap kena.
    queryKey: ['admin-mechanics', 'active'],
    queryFn: () => fetcher('/admin/mechanics?is_active=true')
  });
  const mechanics = mechanicsQuery.data ?? [];

  const [selectedMechanicId, setSelectedMechanicId] = useState('');
  const assignMutation = useMutation({
    mutationFn: ({ id, mechanic_id }: { id: string; mechanic_id: string }) =>
      fetcher(`/admin/bookings/${id}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ mechanic_id })
      }),
    onSuccess: () => {
      toast.success('Mekanik berhasil ditugaskan');
      qc.invalidateQueries({ queryKey: ['admin-bookings'] });
      qc.invalidateQueries({ queryKey: ['admin-booking'] });
      qc.invalidateQueries({ queryKey: ['admin-mechanics'] });
      setSelectedMechanicId('');
    },
    onError: (e: Error) => toast.error(e.message)
  });

  // Reset isian sheet saat booking lain dibuka
  useEffect(() => {
    setSelectedMechanicId('');
    setStatusNote('');
    setUploadCaption('');
  }, [detailId]);

  // Unggah foto kondisi kendaraan (multipart, jadi tidak lewat fetcher JSON)
  const [uploadStage, setUploadStage] = useState<'checkin' | 'checkout'>('checkin');
  const [uploadCaption, setUploadCaption] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  async function handleUploadPhoto(bookingId: string, file: File) {
    // Batas sama dengan server (photos/route.ts), supaya admin tidak menunggu upload yang pasti ditolak.
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran foto maksimal 2 MB.');
      return;
    }
    try {
      setIsUploadingPhoto(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('stage', uploadStage);
      if (uploadCaption) formData.append('caption', uploadCaption);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/admin/bookings/${bookingId}/photos`, {
        method: 'POST',
        headers,
        body: formData
      });
      // Platform bisa membalas non-JSON (misal 413 file terlalu besar); jangan tampilkan pesan parser.
      const json = await res.json().catch(() => ({ message: `Gagal mengunggah foto (kode ${res.status}).` }));
      if (!res.ok) throw new Error(json.message || 'Gagal mengunggah foto');
      toast.success('Foto kondisi kendaraan berhasil diunggah');
      qc.invalidateQueries({ queryKey: ['admin-bookings'] });
      qc.invalidateQueries({ queryKey: ['admin-booking'] });
      setUploadCaption('');
    } catch (err: any) {
      toast.error(err.message || 'Gagal upload foto');
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  // Kanban: geser kartu ke kolom lain = ubah status
  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId as BookingStatus;
    const bookingId = result.draggableId;
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking || booking.status === newStatus || statusMutation.isPending) return;
    const reason = bookingStatusBlockReason(booking.status, newStatus, booking.scheduled_at);
    if (reason) {
      toast.error(reason);
      return;
    }
    changeStatus(booking, newStatus);
  }

  const [cancelWarning, setCancelWarning] = useState<{
    bookingId: string;
    dpAmount: number;
    customerName: string;
    customerPhone: string;
    note?: string;
  } | null>(null);

  // Semua perubahan status lewat sini: pembatalan langsung mengirim notifikasi ke pelanggan
  // dan jika ada DP (Uang Hangat), tampilkan peringatan wajib refund.
  function changeStatus(b: { id: string; status: BookingStatus; scheduled_at: string }, to: BookingStatus, note?: string) {
    if (bookingStatusBlockReason(b.status, to, b.scheduled_at)) return;

    if (to === 'dibatalkan') {
      const fullBooking = bookings.find((item) => item.id === b.id) || (detailBooking?.id === b.id ? detailBooking : null);
      const dpPayment = fullBooking?.payments?.find((p) => p.payment_type === 'dp' && p.status === 'paid');

      if (dpPayment && Number(dpPayment.amount) > 0) {
        setCancelWarning({
          bookingId: b.id,
          dpAmount: Number(dpPayment.amount),
          customerName: fullBooking?.customer?.full_name || 'Pelanggan',
          customerPhone: fullBooking?.customer?.phone || '',
          note
        });
        return;
      }

      if (!window.confirm('Batalkan booking ini? Pelanggan langsung diberi notifikasi dan status ini final.')) {
        return;
      }
    }
    statusMutation.mutate({ id: b.id, status: to, note });
  }

  const from = data && data.meta.total > 0 ? (data.meta.page - 1) * data.meta.limit + 1 : 0;
  const to = data ? Math.min(data.meta.page * data.meta.limit, data.meta.total) : 0;

  return (
    <div className="space-y-5">
      {/* Judul + pilihan tampilan */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Booking</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400" aria-live="polite">
            {isLoading
              ? 'Memuat booking...'
              : data
                ? `${data.meta.total.toLocaleString('id-ID')} booking${hasFilter ? ' sesuai filter' : ''}`
                : 'Jadwal servis bengkel'}
          </p>
        </div>
        <div role="group" aria-label="Tampilan" className="inline-flex rounded-ctl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
          {(
            [
              { id: 'table', label: 'Tabel', icon: Table2 },
              { id: 'kanban', label: 'Kanban', icon: LayoutGrid }
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => setView(id)}
              className={clsx(
                'inline-flex h-9 items-center gap-1.5 rounded-chip px-3 text-sm font-medium transition-colors',
                view === id
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Switcher: Semua Booking vs Servis On Progress vs Servis Selesai */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <Link
          href="/admin/bookings"
          className="inline-flex items-center gap-2 border-b-2 border-primary-600 px-4 py-2.5 text-sm font-semibold text-primary-600 dark:border-primary-400 dark:text-primary-400"
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
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
        </Link>
        <Link
          href="/admin/servis-selesai"
          className="group inline-flex items-center gap-2 border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-white transition-colors"
        >
          <CheckCircle2 className="h-4 w-4 text-slate-400 group-hover:text-emerald-500" />
          <span>Servis Selesai</span>
        </Link>
      </div>

      {/* Filter */}
      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[minmax(0,1fr)_180px_160px_160px_auto] md:items-end">
        <div className="col-span-2 md:col-span-1">
          <label htmlFor="f-search" className={fieldLabel}>Cari</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
            <input
              id="f-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Nama pelanggan atau plat nomor"
              className={clsx(field, 'pl-9')}
            />
          </div>
        </div>
        <div className="col-span-2 md:col-span-1">
          <label htmlFor="f-status" className={fieldLabel}>Status</label>
          <select
            id="f-status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className={field}
          >
            <option value="">Semua status</option>
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-start" className={fieldLabel}>Jadwal dari (WIB)</label>
          <input
            id="f-start"
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="f-end" className={fieldLabel}>Sampai (WIB)</label>
          <input
            id="f-end"
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className={field}
          />
        </div>
        <button
          type="button"
          onClick={resetFilters}
          disabled={!hasFilter && !searchInput}
          className="col-span-2 inline-flex h-11 items-center justify-center rounded-ctl border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800 transition-colors md:col-span-1"
        >
          Reset filter
        </button>
      </div>

      {isError && (
        <ErrorState title="Daftar booking belum bisa dimuat" message={(error as Error)?.message} onRetry={() => refetch()} />
      )}

      {isLoading && <ListSkeleton />}

      {data && bookings.length === 0 && (
        <EmptyState
          icon={Inbox}
          title={hasFilter ? 'Tidak ada booking yang cocok' : 'Belum ada booking'}
          description={
            hasFilter
              ? 'Coba ubah kata kunci, status, atau rentang tanggal.'
              : 'Booking dari pelanggan akan muncul di sini.'
          }
          action={hasFilter ? { label: 'Reset filter', onClick: resetFilters } : undefined}
        />
      )}

      {/* Tampilan tabel */}
      {data && bookings.length > 0 && view === 'table' && (
        <>
          {/* HP & tablet: daftar kartu */}
          <ul className="space-y-2 lg:hidden" aria-busy={isFetching}>
            {bookings.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => setDetailId(b.id)}
                  className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-primary-600 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary-500 transition-colors"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-900 dark:text-white">{b.customer.full_name}</span>
                      <span className="block text-[13px] text-slate-600 dark:text-slate-400">
                        <span className="font-mono">{bookingCode(b.id)}</span>
                      </span>
                    </span>
                    <Plate number={b.vehicle.plate_number} size="sm" className="shrink-0" />
                  </span>
                  <span className="mt-2 block truncate text-[13px] text-slate-600 dark:text-slate-400">{servicesText(b)}</span>
                  <span className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[13px] tabular-nums text-slate-700 dark:text-slate-300">{adminSchedule(b.scheduled_at)}</span>
                    <StatusBadge status={b.status} size="sm" />
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {/* Desktop: tabel padat */}
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:block">
            <table className="w-full min-w-[860px] text-sm" aria-busy={isFetching}>
              <caption className="sr-only">Daftar booking, klik baris untuk membuka detail</caption>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[13px] font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                  <th scope="col" className="px-4 py-3 font-semibold">Pelanggan</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Kendaraan</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Jadwal (WIB)</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Layanan dan mekanik</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Estimasi</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {bookings.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => setDetailId(b.id)}
                    className={clsx(
                      'h-[52px] cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors',
                      detailId === b.id && 'bg-primary-50/60 dark:bg-primary-900/20'
                    )}
                  >
                    <td className="max-w-[220px] px-4 py-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailId(b.id);
                        }}
                        className="block max-w-full truncate rounded-plate text-left font-medium text-slate-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-100"
                      >
                        {b.customer.full_name}
                      </button>
                      <span className="block font-mono text-[12px] text-slate-600 dark:text-slate-400">{bookingCode(b.id)}</span>
                    </td>
                    <td className="px-4 py-2">
                      <Plate number={b.vehicle.plate_number} size="sm" />
                      <span className="mt-0.5 block truncate text-[12px] text-slate-600 dark:text-slate-400">
                        {b.vehicle.brand} {b.vehicle.model}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 tabular-nums text-slate-700 dark:text-slate-300">
                      {adminDate(b.scheduled_at)}
                      <span className="block text-[12px] text-slate-600 dark:text-slate-400">{adminTime(b.scheduled_at)}</span>
                    </td>
                    <td className="max-w-[240px] px-4 py-2">
                      <span className="block truncate text-slate-700 dark:text-slate-300" title={servicesText(b)}>{servicesText(b)}</span>
                      <span className="block truncate text-[12px] text-slate-600 dark:text-slate-400">
                        {b.mechanic ? `Mekanik: ${b.mechanic.full_name}` : 'Belum ada mekanik'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-slate-900 dark:text-white">
                      {formatRp(toNumber(b.final_cost ?? b.estimated_cost))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <StatusBadge status={b.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Tampilan kanban */}
      {data && bookings.length > 0 && view === 'kanban' && (
        <div className="space-y-2">
          <p className="text-[13px] text-slate-600 dark:text-slate-400">
            Geser kartu ke kolom lain untuk mengubah status (keyboard: Tab ke kartu, Spasi untuk mengangkat, panah untuk memindah, Spasi lagi untuk menaruh). Enter membuka detail. Booking dibatalkan hanya tampil di Tabel.
          </p>
          {/* shortcut: kanban memakai data halaman tabel (maks 50); upgrade = endpoint hitungan per status di server. */}
          {data.meta.total_pages > 1 && (
            <p role="note" className="rounded-ctl border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              Kanban hanya menampilkan halaman {page} ({bookings.length} dari {data.meta.total.toLocaleString('id-ID')} booking).
              Angka di tiap kolom dihitung dari halaman ini. Pakai filter tanggal atau status untuk mempersempit.
            </p>
          )}
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {KANBAN_COLS.map((col) => {
                const colBookings = bookings.filter((b) => b.status === col.id);
                return (
                  <section key={col.id} aria-label={`Kolom ${col.label}`} className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-slate-100/70 dark:border-slate-800 dark:bg-slate-900/60">
                    <header className="flex items-center justify-between px-4 py-3">
                      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                        <span className={clsx('h-2.5 w-2.5 rounded-full', STATUS_DOT[col.id])} aria-hidden />
                        {col.label}
                      </h2>
                      <span className="text-[13px] tabular-nums text-slate-600 dark:text-slate-400">{colBookings.length}</span>
                    </header>
                    <Droppable droppableId={col.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={clsx(
                            'min-h-[160px] flex-1 space-y-2 rounded-b-2xl px-2 pb-2 transition-colors',
                            snapshot.isDraggingOver && 'bg-primary-50 dark:bg-primary-900/30'
                          )}
                        >
                          {colBookings.map((b, index) => (
                            <Draggable key={b.id} draggableId={b.id} index={index}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  aria-label={`${b.customer.full_name}, ${b.vehicle.plate_number}, ${adminSchedule(b.scheduled_at)}`}
                                  onClick={() => setDetailId(b.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') setDetailId(b.id);
                                  }}
                                  className={clsx(
                                    'cursor-pointer space-y-2 rounded-ctl border bg-white p-3 dark:bg-slate-900',
                                    dragSnapshot.isDragging
                                      ? 'border-primary-600 shadow-lg'
                                      : 'border-slate-200 hover:border-primary-600 dark:border-slate-800 dark:hover:border-primary-500'
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-white">{b.customer.full_name}</p>
                                    <Plate number={b.vehicle.plate_number} size="sm" className="shrink-0" />
                                  </div>
                                  <p className="truncate text-[13px] text-slate-600 dark:text-slate-400">{servicesText(b)}</p>
                                  <p className="flex items-center gap-1.5 text-[13px] tabular-nums text-slate-700 dark:text-slate-300">
                                    <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                    {adminSchedule(b.scheduled_at)}
                                  </p>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {colBookings.length === 0 && !snapshot.isDraggingOver && (
                            <p className="px-2 py-6 text-center text-[13px] text-slate-600 dark:text-slate-400">Kosong</p>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </section>
                );
              })}
            </div>
          </DragDropContext>
        </div>
      )}

      {/* Halaman */}
      {data && data.meta.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-400">
          <span className="tabular-nums">
            {from.toLocaleString('id-ID')} sampai {to.toLocaleString('id-ID')} dari {data.meta.total.toLocaleString('id-ID')}
          </span>
          {data.meta.total_pages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                aria-label="Halaman sebelumnya"
                className="inline-flex h-11 w-11 items-center justify-center rounded-ctl border border-slate-200 bg-white hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <span className="px-3 tabular-nums">
                Halaman {page} dari {data.meta.total_pages}
              </span>
              <button
                type="button"
                disabled={page >= data.meta.total_pages}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Halaman berikutnya"
                className="inline-flex h-11 w-11 items-center justify-center rounded-ctl border border-slate-200 bg-white hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Detail booking */}
      <Sheet open={!!detailId} onOpenChange={(v) => !v && closeDetail()}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="gap-0 overflow-y-auto bg-white p-0 text-slate-900 data-[side=right]:w-full data-[side=right]:border-slate-200 dark:bg-slate-900 dark:text-white dark:data-[side=right]:border-slate-800 data-[side=right]:sm:max-w-lg"
        >
          <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="min-w-0">
              <SheetTitle className="text-lg font-bold text-slate-900 dark:text-white">
                {detailBooking?.status === 'selesai' ? 'Detail servis' : 'Detail booking'}
              </SheetTitle>
              <SheetDescription className="font-mono text-[13px] text-slate-600 dark:text-slate-400">
                {detailBooking ? bookingCode(detailBooking.id) : detailId ? bookingCode(detailId) : ''}
              </SheetDescription>
            </div>
            <SheetClose
              aria-label="Tutup detail"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-ctl text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
            >
              <X className="h-5 w-5" aria-hidden />
            </SheetClose>
          </div>

          {detailBooking ? (
            <div className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
              {/* Ringkasan */}
              <section className="space-y-3 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <StatusBadge status={detailBooking.status} />
                  <span className="text-[13px] tabular-nums text-slate-700 dark:text-slate-300">
                    {adminDate(detailBooking.scheduled_at)}, {adminTime(detailBooking.scheduled_at)} WIB
                  </span>
                </div>
                {detailBooking.branch && (
                  <p className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                    <span className="min-w-0">
                      {shortBranchName(detailBooking.branch.name)}
                      {detailQuery.data?.branch?.address && (
                        <span className="block text-[13px] text-slate-600 dark:text-slate-400">{detailQuery.data.branch.address}</span>
                      )}
                    </span>
                  </p>
                )}
                {detailQuery.isError && (
                  <div role="alert" className="flex items-center justify-between gap-3 rounded-ctl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                    Detail terbaru belum bisa dimuat, data dari daftar ditampilkan.
                    <button type="button" onClick={() => detailQuery.refetch()} className="min-h-[44px] shrink-0 px-2 font-semibold underline-offset-2 hover:underline">
                      Coba lagi
                    </button>
                  </div>
                )}
              </section>

              {/* Pelanggan & kendaraan */}
              <section className="grid gap-4 px-5 py-4 sm:grid-cols-2">
                <div className="min-w-0 space-y-1.5">
                  <h3 className={sectionTitle}>Pelanggan</h3>
                  <p className="truncate font-medium">{detailBooking.customer.full_name}</p>
                  {detailBooking.customer.phone && (
                    <a
                      href={`tel:${detailBooking.customer.phone.replace(/[^0-9+]/g, '')}`}
                      className="flex min-h-[32px] items-center gap-2 text-primary-700 hover:underline dark:text-primary-100"
                    >
                      <Phone className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="tabular-nums">{detailBooking.customer.phone}</span>
                    </a>
                  )}
                  {detailBooking.customer.email && (
                    <a
                      href={`mailto:${detailBooking.customer.email}`}
                      className="flex min-h-[32px] min-w-0 items-center gap-2 text-primary-700 hover:underline dark:text-primary-100"
                    >
                      <Mail className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="truncate">{detailBooking.customer.email}</span>
                    </a>
                  )}
                </div>
                <div className="space-y-1.5">
                  <h3 className={sectionTitle}>Kendaraan</h3>
                  <Plate number={detailBooking.vehicle.plate_number} size="lg" />
                  <p className="text-slate-700 dark:text-slate-300">
                    {detailBooking.vehicle.brand} {detailBooking.vehicle.model}
                    {detailBooking.vehicle.year ? ` (${detailBooking.vehicle.year})` : ''}
                  </p>
                  <p className="capitalize text-slate-600 dark:text-slate-400">{detailBooking.vehicle.vehicle_type}</p>
                </div>
              </section>

              {/* Layanan */}
              <section className="space-y-2 px-5 py-4">
                <h3 className={sectionTitle}>Layanan</h3>
                <ul className="space-y-1.5">
                  {detailBooking.booking_services.map((bs, i) => (
                    <li key={i} className="flex justify-between gap-3 text-slate-700 dark:text-slate-300">
                      <span className="min-w-0">{bs.service.name}</span>
                      <span className="shrink-0 tabular-nums">{formatRp(toNumber(bs.price_at_booking ?? bs.service.price))}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between gap-3 border-t border-slate-200 pt-2 font-semibold dark:border-slate-800">
                  <span>Estimasi total</span>
                  <span className="tabular-nums">{formatRp(toNumber(detailBooking.estimated_cost))}</span>
                </div>
                {detailBooking.final_cost != null && (
                  <div className="flex justify-between gap-3 font-semibold">
                    <span>Biaya akhir</span>
                    <span className="tabular-nums">{formatRp(toNumber(detailBooking.final_cost))}</span>
                  </div>
                )}
                {detailBooking.status === 'selesai' ? (
                  <>
                    <div className="flex justify-between gap-3 text-[13px] text-slate-700 dark:text-slate-300">
                      <span>Total dibayar</span>
                      <span className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
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
                      const finalAmount = toNumber(detailBooking.final_cost ?? detailBooking.estimated_cost);
                      const change = totalPaid - finalAmount;
                      if (change > 0) {
                        return (
                          <div className="flex justify-between gap-3 rounded-ctl bg-emerald-50 px-2.5 py-1.5 text-[13px] font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                            <span>Kembalian</span>
                            <span className="tabular-nums">{formatRp(change)}</span>
                          </div>
                        );
                      }
                      if (change < 0) {
                        return (
                          <div className="flex justify-between gap-3 rounded-ctl bg-amber-50 px-2.5 py-1.5 text-[13px] font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                            <span>Sisa belum lunas</span>
                            <span className="tabular-nums">{formatRp(Math.abs(change))}</span>
                          </div>
                        );
                      }
                      return (
                        <div className="flex justify-between gap-3 rounded-ctl bg-slate-100 px-2.5 py-1 text-[13px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          <span>Kembalian</span>
                          <span className="tabular-nums">Rp 0 (Lunas Pas)</span>
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <a
                    href={`/admin/pembayaran?booking_id=${detailBooking.id}`}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-ctl border border-slate-300 px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Wallet className="h-4 w-4" aria-hidden />
                    Catat pembayaran
                  </a>
                )}
                {detailBooking.complaint_notes && (
                  <div className="mt-2 rounded-ctl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
                    <p className="text-[13px] font-semibold text-slate-900 dark:text-white">Keluhan pelanggan</p>
                    <p className="text-slate-700 dark:text-slate-300">{detailBooking.complaint_notes}</p>
                  </div>
                )}
              </section>

              {/* Ubah status */}
              <section className="space-y-3 px-5 py-4">
                <h3 className={sectionTitle} id="status-group">Ubah status</h3>
                <div role="group" aria-labelledby="status-group" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {STATUSES.map((s) => {
                    const current = detailBooking.status === s.id;
                    const reason = current ? null : bookingStatusBlockReason(detailBooking.status, s.id, detailBooking.scheduled_at);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={current}
                        disabled={current || !!reason || statusMutation.isPending}
                        title={reason ?? undefined}
                        onClick={() => changeStatus(detailBooking, s.id, statusNote.trim() || undefined)}
                        className={clsx(
                          'inline-flex h-11 items-center justify-center gap-2 rounded-ctl border px-2 text-[13px] font-semibold transition-colors',
                          current
                            ? 'border-primary-600 bg-primary-50 text-primary-700 dark:border-primary-500 dark:bg-primary-900/40 dark:text-primary-100'
                            : 'border-slate-300 text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800'
                        )}
                      >
                        <span className={clsx('h-2 w-2 rounded-full', STATUS_DOT[s.id])} aria-hidden />
                        {s.label}
                      </button>
                    );
                  })}
                </div>
                {BOOKING_STATUS_TRANSITIONS[detailBooking.status].length === 0 ? (
                  <p className="text-[13px] text-slate-600 dark:text-slate-400">Status booking ini sudah final dan tidak bisa diubah lagi.</p>
                ) : detailBooking.status === 'dikonfirmasi' && !isScheduleDayReached(detailBooking.scheduled_at) ? (
                  <p className="text-[13px] text-slate-600 dark:text-slate-400">Servis baru bisa dimulai (Diproses) pada hari jadwal booking.</p>
                ) : null}
                <div>
                  <label htmlFor="status-note" className={fieldLabel}>
                    Catatan untuk pelanggan (opsional)
                  </label>
                  <input
                    id="status-note"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    maxLength={500}
                    placeholder="Contoh: kampas rem depan diganti"
                    className={field}
                  />
                  <p className="mt-1 text-[12px] text-slate-600 dark:text-slate-400">
                    Dikirim bersama notifikasi perubahan status ke pelanggan.
                  </p>
                </div>
              </section>

              {/* Mekanik */}
              <section className="space-y-2 px-5 py-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={sectionTitle}>Mekanik</h3>
                  <span className="text-[13px] text-slate-600 dark:text-slate-400">
                    {detailBooking.mechanic
                      ? `Saat ini: ${detailBooking.mechanic.full_name}`
                      : 'Belum ditugaskan'}
                  </span>
                </div>
                {mechanicsQuery.isError ? (
                  <div className="flex items-center justify-between gap-3 rounded-ctl border border-red-200 bg-red-50 px-3 py-2 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200" role="alert">
                    Daftar mekanik belum bisa dimuat.
                    <button type="button" onClick={() => mechanicsQuery.refetch()} className="min-h-[44px] px-2 font-semibold underline-offset-2 hover:underline">
                      Coba lagi
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <label htmlFor="assign-mechanic" className="sr-only">Pilih mekanik</label>
                    <select
                      id="assign-mechanic"
                      value={selectedMechanicId || detailBooking.mechanic?.id || ''}
                      onChange={(e) => setSelectedMechanicId(e.target.value)}
                      disabled={mechanicsQuery.isLoading || BOOKING_STATUS_TRANSITIONS[detailBooking.status].length === 0}
                      className={clsx(field, 'min-w-0 flex-1')}
                    >
                      <option value="">{mechanicsQuery.isLoading ? 'Memuat mekanik...' : 'Pilih mekanik'}</option>
                      {mechanics.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.full_name} ({m.specialty}), {m.active_jobs_count > 0 ? `${m.active_jobs_count} pekerjaan aktif` : 'tersedia'}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={
                        !selectedMechanicId ||
                        selectedMechanicId === detailBooking.mechanic?.id ||
                        assignMutation.isPending ||
                        BOOKING_STATUS_TRANSITIONS[detailBooking.status].length === 0
                      }
                      onClick={() => assignMutation.mutate({ id: detailBooking.id, mechanic_id: selectedMechanicId })}
                      className="inline-flex h-11 shrink-0 items-center rounded-ctl bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                    >
                      {assignMutation.isPending ? 'Menyimpan...' : 'Tugaskan'}
                    </button>
                  </div>
                )}
                {!mechanicsQuery.isLoading && !mechanicsQuery.isError && mechanics.length === 0 && (
                  <p className="text-[13px] text-slate-600 dark:text-slate-400">Belum ada mekanik aktif. Tambahkan di menu Mekanik.</p>
                )}
              </section>

              {/* Riwayat status (dari endpoint detail) */}
              <section className="space-y-3 px-5 py-4">
                <h3 className={clsx(sectionTitle, 'flex items-center gap-2')}>
                  <History className="h-4 w-4 text-slate-500" aria-hidden />
                  Riwayat status
                </h3>
                {statusHistory === null ? (
                  detailQuery.isError ? (
                    <p className="text-[13px] text-slate-600 dark:text-slate-400">Riwayat belum bisa dimuat.</p>
                  ) : (
                    <div className="space-y-2" role="status" aria-label="Memuat riwayat status">
                      <SkeletonBlock className="h-10 w-full" />
                      <SkeletonBlock className="h-10 w-full" />
                    </div>
                  )
                ) : statusHistory.length === 0 ? (
                  <p className="text-[13px] text-slate-600 dark:text-slate-400">Belum ada perubahan status.</p>
                ) : (
                  <ol className="space-y-3 border-l border-slate-200 pl-4 dark:border-slate-800">
                    {statusHistory.map((h) => (
                      <li key={h.id} className="relative">
                        <span
                          aria-hidden
                          className={clsx('absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-900', STATUS_DOT[h.status])}
                        />
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                          <StatusBadge status={h.status} size="sm" />
                          <time dateTime={h.changed_at} className="text-[12px] tabular-nums text-slate-600 dark:text-slate-400">
                            {adminSchedule(h.changed_at)}
                          </time>
                        </div>
                        {h.note && <p className="mt-1 text-slate-700 dark:text-slate-300">{h.note}</p>}
                        {h.changer && (
                          <p className="text-[12px] text-slate-600 dark:text-slate-400">
                            Oleh {h.changer.full_name}
                            {h.changer.role === 'customer' ? ' (pelanggan)' : ''}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              {/* Foto kondisi */}
              <section className="space-y-3 px-5 py-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={clsx(sectionTitle, 'flex items-center gap-2')}>
                    <Camera className="h-4 w-4 text-slate-500" aria-hidden />
                    Foto kondisi kendaraan
                  </h3>
                  <span className="text-[13px] tabular-nums text-slate-600 dark:text-slate-400">
                    {detailBooking.photos?.length ?? 0} foto
                  </span>
                </div>

                {detailBooking.photos && detailBooking.photos.length > 0 ? (
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {detailBooking.photos.map((p) => (
                      <li key={p.id} className="overflow-hidden rounded-ctl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60">
                        <a href={p.photo_url} target="_blank" rel="noreferrer" className="block" aria-label={`Buka foto ${p.caption || p.stage} di tab baru`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.photo_url}
                            alt={p.caption || `Foto ${p.stage === 'checkin' ? 'check-in' : 'check-out'}`}
                            className="h-24 w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.visibility = 'hidden';
                            }}
                          />
                        </a>
                        <div className="px-2 py-1.5">
                          <p className="text-[12px] font-semibold text-slate-900 dark:text-white">
                            {p.stage === 'checkin' ? 'Check-in' : 'Check-out'}
                          </p>
                          {p.caption && <p className="truncate text-[12px] text-slate-600 dark:text-slate-400">{p.caption}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13px] text-slate-600 dark:text-slate-400">Belum ada foto kondisi yang diunggah.</p>
                )}

                <div className="space-y-3 rounded-ctl border border-dashed border-slate-300 p-3 dark:border-slate-700">
                  <p className="text-[13px] font-semibold text-slate-900 dark:text-white">Unggah foto baru</p>
                  <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
                    <div>
                      <label htmlFor="photo-stage" className={fieldLabel}>Tahap</label>
                      <select
                        id="photo-stage"
                        value={uploadStage}
                        onChange={(e) => setUploadStage(e.target.value as 'checkin' | 'checkout')}
                        className={field}
                      >
                        <option value="checkin">Check-in (masuk)</option>
                        <option value="checkout">Check-out (selesai)</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="photo-caption" className={fieldLabel}>Keterangan (opsional)</label>
                      <input
                        id="photo-caption"
                        value={uploadCaption}
                        onChange={(e) => setUploadCaption(e.target.value)}
                        placeholder="Contoh: baret bumper depan"
                        className={field}
                      />
                    </div>
                  </div>
                  <label
                    className={clsx(
                      'flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-ctl border border-primary-600 text-sm font-semibold text-primary-700 hover:bg-primary-50 focus-within:ring-2 focus-within:ring-primary-600 focus-within:ring-offset-2 dark:border-primary-500 dark:text-primary-100 dark:hover:bg-primary-900/30 dark:focus-within:ring-offset-slate-900 transition-colors',
                      isUploadingPhoto && 'pointer-events-none opacity-50'
                    )}
                  >
                    <Upload className="h-4 w-4" aria-hidden />
                    {isUploadingPhoto ? 'Mengunggah...' : 'Pilih foto lalu unggah'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      className="sr-only"
                      disabled={isUploadingPhoto}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadPhoto(detailBooking.id, file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <p className="text-[12px] text-slate-600 dark:text-slate-400">JPG atau PNG, maksimal 2 MB.</p>
                </div>
              </section>
            </div>
          ) : (
            <div className="space-y-3 px-5 py-8 text-sm">
              {isLoading || detailQuery.isLoading ? (
                <>
                  <SkeletonBlock className="h-6 w-40" />
                  <SkeletonBlock className="h-24 w-full" />
                  <SkeletonBlock className="h-24 w-full" />
                </>
              ) : (
                <>
                  <p className="font-semibold text-slate-900 dark:text-white">Detail booking belum bisa dibuka</p>
                  <p className="text-slate-600 dark:text-slate-400">
                    {(detailQuery.error as Error | null)?.message ?? 'Booking tidak ditemukan.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => detailQuery.refetch()}
                    className="mr-2 inline-flex h-11 items-center rounded-ctl bg-primary-600 px-4 font-semibold text-white hover:bg-primary-700 transition-colors"
                  >
                    Coba lagi
                  </button>
                  <SheetClose className="inline-flex h-11 items-center rounded-ctl border border-slate-300 px-4 font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800 transition-colors">
                    Tutup
                  </SheetClose>
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Warning Dialog: Pembatalan Booking yang Memiliki DP (Uang Hangat) */}
      <AdminDialog
        open={!!cancelWarning}
        onClose={() => setCancelWarning(null)}
        title="⚠️ Peringatan: Booking Memiliki DP (Uang Hangat)"
        description="Booking ini memiliki pembayaran DP aktif yang wajib dikembalikan ke pelanggan."
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setCancelWarning(null)}
              className={btnSecondary}
            >
              Kembali (Jangan Batalkan)
            </button>
            <button
              type="button"
              disabled={statusMutation.isPending}
              onClick={() => {
                if (!cancelWarning) return;
                statusMutation.mutate({
                  id: cancelWarning.bookingId,
                  status: 'dibatalkan',
                  note: cancelWarning.note
                    ? `${cancelWarning.note} · [Refund DP ${formatRp(cancelWarning.dpAmount)}]`
                    : `Dibatalkan oleh pihak bengkel. [Wajib Refund DP ${formatRp(cancelWarning.dpAmount)}]`
                });
                setCancelWarning(null);
              }}
              className={btnDanger}
            >
              {statusMutation.isPending ? 'Membatalkan...' : 'Ya, Batalkan & Proses Refund DP'}
            </button>
          </>
        }
      >
        <div className="space-y-3.5 text-sm">
          <div className="rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            <p className="font-semibold text-base text-red-700 dark:text-red-400">
              Total DP Wajib Refund: {formatRp(cancelWarning?.dpAmount ?? 0)}
            </p>
            <p className="mt-1 text-xs text-red-800 dark:text-red-300 leading-relaxed">
              Karena pembatalan dilakukan atas inisiatif pihak bengkel/admin, dana DP ini <strong>wajib dikembalikan penuh</strong> kepada pelanggan. Dana ini sebelumnya berstatus <em>Uang Hangat</em> (bukan pendapatan lunas bengkel).
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-900">
            <p className="font-medium text-slate-700 dark:text-slate-300">
              Kontak Pelanggan untuk Konfirmasi Refund:
            </p>
            <p className="font-bold text-slate-900 dark:text-white mt-0.5">
              {cancelWarning?.customerName} ({cancelWarning?.customerPhone || 'Tanpa no HP'})
            </p>
            {cancelWarning?.customerPhone && (
              <a
                href={`https://wa.me/${cancelWarning.customerPhone.replace(/\D/g, '').replace(/^0/, '62')}?text=${encodeURIComponent(
                  `Halo ${cancelWarning.customerName}, kami dari bengkel ServiceGo mengonfirmasi bahwa booking kamu dibatalkan oleh pihak bengkel. Pengembalian dana DP (Uang Hangat) sebesar ${formatRp(cancelWarning.dpAmount)} akan kami proses. Mohon kirimkan nomor rekening tujuan pengembalian dana ya.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
              >
                Chat WhatsApp Pelanggan untuk Pengembalian Dana &rarr;
              </a>
            )}
          </div>
        </div>
      </AdminDialog>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2" role="status" aria-label="Memuat booking">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonBlock key={i} className="h-[52px] w-full" />
      ))}
    </div>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <BookingsPageContent />
    </Suspense>
  );
}
