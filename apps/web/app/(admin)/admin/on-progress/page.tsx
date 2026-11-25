'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  PlayCircle,
  CheckCircle2,
  Clock,
  Wrench,
  RefreshCw,
  Search,
  Phone,
  MessageSquare,
  Camera,
  ArrowRight,
  UserCheck,
  AlertCircle,
  Calendar,
  MapPin,
  Flame,
  Eye,
  SlidersHorizontal,
  Table2,
  LayoutGrid,
  Check,
  ChevronRight,
  X,
  Sparkles,
  ExternalLink,
  Car,
  ShieldCheck,
  UploadCloud
} from 'lucide-react';
import { clsx } from 'clsx';
import { bookingStatusBlockReason } from '@servicego/shared';
import { fetcher } from '@/lib/fetcher';
import { supabase } from '@/lib/supabase-client';
import { bookingCode, formatRp } from '@/lib/format';
import { Plate } from '@/components/customer/plate';
import { StatusBadge } from '@/components/status-badge';
import {
  AdminPageHeader,
  btnPrimary,
  btnSecondary,
  btnDanger,
  btnRow,
  inputCls,
  TableCard,
  Th,
  Td,
  theadCls,
  tbodyCls,
  TableSkeleton
} from '@/components/admin/resource-ui';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { adminDate, adminSchedule, adminTime, toNumber } from '@/components/admin/format';

type BookingStatus = 'menunggu' | 'dikonfirmasi' | 'diproses' | 'selesai' | 'dibatalkan';

interface OnProgressBooking {
  id: string;
  status: BookingStatus;
  scheduled_at: string;
  complaint_notes: string | null;
  estimated_cost: number | string;
  final_cost?: number | string | null;
  created_at?: string;
  updated_at?: string;
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
    phone?: string | null;
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
    service: {
      id: string;
      name: string;
      duration_minutes?: number | null;
      price: number | string;
    };
  }>;
  status_history: Array<{
    id: string;
    changed_at: string;
    status: BookingStatus;
    note: string | null;
    changer: {
      id: string;
      full_name: string;
      role: string;
    } | null;
  }>;
  payments?: Array<{
    id: string;
    amount: number | string;
    payment_type: 'dp' | 'pelunasan';
    method: string;
    status: string;
    paid_at: string | null;
  }>;
}

interface ActiveMechanic {
  id: string;
  full_name: string;
  specialty: string;
  branch_id: string;
  active_jobs_count: number;
}

interface OnProgressResponse {
  today: string;
  summary: {
    in_progress_count: number;
    ready_today_count: number;
    total_active_queue: number;
    completed_today_count: number;
    active_mechanics_count: number;
    available_mechanics_count: number;
  };
  items: {
    in_progress: OnProgressBooking[];
    ready_today: OnProgressBooking[];
    completed_today: OnProgressBooking[];
  };
  mechanics: ActiveMechanic[];
}

interface BranchOption {
  id: string;
  name: string;
}

type StageTab = 'all_active' | 'in_progress' | 'ready_today' | 'completed_today';

function OnProgressContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<StageTab>('all_active');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [branchFilter, setBranchFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // Selected booking for detailed sheet
  const [detailBooking, setDetailBooking] = useState<OnProgressBooking | null>(null);

  // Assign mechanic modal state
  const [assignModalBooking, setAssignModalBooking] = useState<OnProgressBooking | null>(null);
  const [selectedMechanicId, setSelectedMechanicId] = useState('');

  // Upload photo modal state
  const [photoModalBooking, setPhotoModalBooking] = useState<OnProgressBooking | null>(null);
  const [uploadStage, setUploadStage] = useState<'checkin' | 'checkout'>('checkin');
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch On-Progress Data
  const queryParams = new URLSearchParams({
    ...(branchFilter ? { branch_id: branchFilter } : {}),
    ...(search ? { search } : {})
  });

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<OnProgressResponse>({
    queryKey: ['admin-on-progress', branchFilter, search],
    queryFn: () => fetcher(`/admin/on-progress?${queryParams.toString()}`),
    refetchInterval: 15000 // Refresh every 15s to keep workshop board live
  });

  // Fetch Branches for filter
  const branchesQuery = useQuery<BranchOption[]>({
    queryKey: ['admin-branches-list'],
    queryFn: () => fetcher('/branches')
  });
  const branches = branchesQuery.data ?? [];

  // Mutations
  const statusMutation = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: BookingStatus; note?: string }) =>
      fetcher(`/admin/bookings/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, note })
      }),
    onSuccess: (_, variables) => {
      toast.success(
        variables.status === 'diproses'
          ? 'Servis berhasil dimulai. Kendaraan kini berada di pit.'
          : variables.status === 'selesai'
            ? 'Servis berhasil diselesaikan. Pelanggan telah diberi notifikasi.'
            : 'Status booking berhasil diperbarui.'
      );
      qc.invalidateQueries({ queryKey: ['admin-on-progress'] });
      qc.invalidateQueries({ queryKey: ['admin-bookings'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
      if (detailBooking && detailBooking.id === variables.id) {
        setDetailBooking((prev) => (prev ? { ...prev, status: variables.status } : null));
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Gagal mengubah status servis');
    }
  });

  const assignMutation = useMutation({
    mutationFn: ({ bookingId, mechanicId }: { bookingId: string; mechanicId: string }) =>
      fetcher(`/admin/bookings/${bookingId}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ mechanic_id: mechanicId })
      }),
    onSuccess: () => {
      toast.success('Mekanik berhasil ditugaskan ke kendaraan ini');
      qc.invalidateQueries({ queryKey: ['admin-on-progress'] });
      qc.invalidateQueries({ queryKey: ['admin-bookings'] });
      setAssignModalBooking(null);
      setSelectedMechanicId('');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Gagal menugaskan mekanik');
    }
  });

  async function handleUploadPhoto() {
    if (!photoModalBooking || !uploadFile) {
      toast.error('Pilih file foto terlebih dahulu');
      return;
    }
    if (uploadFile.size > 2 * 1024 * 1024) {
      toast.error('Ukuran foto maksimal 2 MB');
      return;
    }

    try {
      setIsUploadingPhoto(true);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('stage', uploadStage);
      if (uploadCaption.trim()) formData.append('caption', uploadCaption.trim());

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/admin/bookings/${photoModalBooking.id}/photos`, {
        method: 'POST',
        headers,
        body: formData
      });

      const json = await res.json().catch(() => ({ message: `Gagal upload foto (status ${res.status})` }));
      if (!res.ok) throw new Error(json.message || 'Gagal mengunggah foto');

      toast.success('Foto dokumentasi pengerjaan berhasil diunggah');
      qc.invalidateQueries({ queryKey: ['admin-on-progress'] });
      qc.invalidateQueries({ queryKey: ['admin-bookings'] });
      setPhotoModalBooking(null);
      setUploadFile(null);
      setUploadCaption('');
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengunggah foto');
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  // Action helpers
  function handleStartService(booking: OnProgressBooking) {
    const reason = bookingStatusBlockReason(booking.status, 'diproses', booking.scheduled_at);
    if (reason) {
      toast.error(reason);
      return;
    }
    statusMutation.mutate({
      id: booking.id,
      status: 'diproses',
      note: 'Servis dimulai oleh staf bengkel (Masuk Pit).'
    });
  }

  function handleCompleteService(booking: OnProgressBooking) {
    if (
      !window.confirm(
        `Selesaikan servis untuk kendaraan ${booking.vehicle.plate_number} (${booking.vehicle.brand} ${booking.vehicle.model})? Pelanggan akan mendapatkan notifikasi bahwa kendaraannya siap diambil.`
      )
    ) {
      return;
    }
    statusMutation.mutate({
      id: booking.id,
      status: 'selesai',
      note: 'Pengerjaan servis selesai. Kendaraan siap diambil pelanggan.'
    });
  }

  function openAssignModal(booking: OnProgressBooking) {
    setAssignModalBooking(booking);
    setSelectedMechanicId(booking.mechanic?.id || '');
  }

  function openPhotoModal(booking: OnProgressBooking, defaultStage: 'checkin' | 'checkout' = 'checkin') {
    setPhotoModalBooking(booking);
    setUploadStage(defaultStage);
    setUploadFile(null);
    setUploadCaption('');
  }

  // Filtered lists based on active stage tab
  const inProgressList = data?.items.in_progress ?? [];
  const readyTodayList = data?.items.ready_today ?? [];
  const completedTodayList = data?.items.completed_today ?? [];

  const displayedBookings = useMemo(() => {
    switch (activeTab) {
      case 'in_progress':
        return inProgressList;
      case 'ready_today':
        return readyTodayList;
      case 'completed_today':
        return completedTodayList;
      case 'all_active':
      default:
        return [...inProgressList, ...readyTodayList];
    }
  }, [activeTab, inProgressList, readyTodayList, completedTodayList]);

  const summary = data?.summary ?? {
    in_progress_count: 0,
    ready_today_count: 0,
    total_active_queue: 0,
    completed_today_count: 0,
    active_mechanics_count: 0,
    available_mechanics_count: 0
  };

  const mechanicsList = data?.mechanics ?? [];

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Servis On Progress</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              Workshop Live
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Pantau dan kelola kendaraan yang sedang dikerjakan di pit serta booking terkonfirmasi yang siap masuk pit hari ini.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className={clsx(btnSecondary, 'h-10 text-xs sm:text-sm')}
            title="Segarkan data servis langsung"
          >
            <RefreshCw className={clsx('h-4 w-4', isFetching && 'animate-spin text-primary-600')} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher: Semua Booking vs Servis On Progress */}
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
          className="group inline-flex items-center gap-2 border-b-2 border-primary-600 px-4 py-2.5 text-sm font-semibold text-primary-600 dark:border-primary-400 dark:text-primary-400"
        >
          <PlayCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>Servis On Progress</span>
          <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-bold text-primary-700 dark:bg-primary-950/80 dark:text-primary-300">
            {summary.total_active_queue}
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

      {/* 4 Summary Telemetry Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Sedang Dikerjakan (In Pit) */}
        <div
          onClick={() => setActiveTab('in_progress')}
          className={clsx(
            'group relative cursor-pointer overflow-hidden rounded-2xl border p-5 transition-all',
            activeTab === 'in_progress'
              ? 'border-blue-500 bg-blue-50/50 shadow-sm dark:border-blue-500/60 dark:bg-blue-950/20'
              : 'border-slate-200 bg-white hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Sedang Dikerjakan
            </span>
            <div className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-600"></span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {summary.in_progress_count}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">kendaraan di pit</span>
          </div>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
            Sedang ditangani oleh teknisi aktif
          </p>
        </div>

        {/* Card 2: Siap Masuk Pit Hari Ini */}
        <div
          onClick={() => setActiveTab('ready_today')}
          className={clsx(
            'group relative cursor-pointer overflow-hidden rounded-2xl border p-5 transition-all',
            activeTab === 'ready_today'
              ? 'border-amber-500 bg-amber-50/50 shadow-sm dark:border-amber-500/60 dark:bg-amber-950/20'
              : 'border-slate-200 bg-white hover:border-amber-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-amber-700'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Siap Masuk Pit
            </span>
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {summary.ready_today_count}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">antrean hari ini</span>
          </div>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
            Booking terkonfirmasi siap dikerjakan
          </p>
        </div>

        {/* Card 3: Total Antrean Aktif Hari Ini */}
        <div
          onClick={() => setActiveTab('all_active')}
          className={clsx(
            'group relative cursor-pointer overflow-hidden rounded-2xl border p-5 transition-all',
            activeTab === 'all_active'
              ? 'border-primary-500 bg-primary-50/50 shadow-sm dark:border-primary-500/60 dark:bg-primary-950/20'
              : 'border-slate-200 bg-white hover:border-primary-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary-700'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-700 dark:text-primary-400">
              Total Antrean Aktif
            </span>
            <Wrench className="h-4 w-4 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {summary.total_active_queue}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">total unit aktif</span>
          </div>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
            {summary.active_mechanics_count} teknisi bertugas • {summary.available_mechanics_count} siap alokasi
          </p>
        </div>

        {/* Card 4: Selesai Hari Ini */}
        <div
          onClick={() => setActiveTab('completed_today')}
          className={clsx(
            'group relative cursor-pointer overflow-hidden rounded-2xl border p-5 transition-all',
            activeTab === 'completed_today'
              ? 'border-emerald-500 bg-emerald-50/50 shadow-sm dark:border-emerald-500/60 dark:bg-emerald-950/20'
              : 'border-slate-200 bg-white hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-700'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Selesai Hari Ini
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {summary.completed_today_count}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">unit selesai</span>
          </div>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
            Servis tuntas & siap diambil pemilik
          </p>
        </div>
      </div>

      {/* Filter and View Controls Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
        {/* Stage Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('all_active')}
            className={clsx(
              'h-9 rounded-chip px-3 text-xs font-semibold transition-colors',
              activeTab === 'all_active'
                ? 'bg-primary-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            )}
          >
            Semua Aktif ({summary.total_active_queue})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('in_progress')}
            className={clsx(
              'h-9 rounded-chip px-3 text-xs font-semibold transition-colors',
              activeTab === 'in_progress'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            )}
          >
            Sedang Dikerjakan ({summary.in_progress_count})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ready_today')}
            className={clsx(
              'h-9 rounded-chip px-3 text-xs font-semibold transition-colors',
              activeTab === 'ready_today'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            )}
          >
            Siap Masuk Pit ({summary.ready_today_count})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('completed_today')}
            className={clsx(
              'h-9 rounded-chip px-3 text-xs font-semibold transition-colors',
              activeTab === 'completed_today'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            )}
          >
            Selesai Hari Ini ({summary.completed_today_count})
          </button>
        </div>

        {/* Search, Branch, & Layout Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Branch Filter */}
          {branches.length > 0 && (
            <select
              aria-label="Filter Cabang Bengkel"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="h-9 rounded-ctl border border-slate-300 bg-white px-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="">Semua Cabang</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          {/* Search Box */}
          <div className="relative min-w-[200px] flex-1 sm:w-64 sm:flex-none">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari plat, nama, telepon..."
              className={clsx(inputCls, 'h-9 pl-8 text-xs')}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

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
              title="Tampilan Kartu Pit Workshop"
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
              title="Tampilan Tabel Grid"
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

      {/* Main Content Area: Loading / Empty / Data */}
      {isLoading ? (
        viewMode === 'cards' ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
              />
            ))}
          </div>
        ) : (
          <TableSkeleton rows={6} cols={6} />
        )
      ) : isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
          <p className="mt-2 text-sm font-semibold">Gagal memuat data pengerjaan on progress</p>
          <p className="text-xs text-red-600 dark:text-red-400">{(error as Error)?.message || 'Terjadi kesalahan sistem'}</p>
          <button type="button" onClick={() => refetch()} className={clsx(btnSecondary, 'mt-4 h-9 text-xs')}>
            Coba lagi
          </button>
        </div>
      ) : displayedBookings.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            <Car className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
            {activeTab === 'in_progress'
              ? 'Tidak ada kendaraan yang sedang dikerjakan saat ini'
              : activeTab === 'ready_today'
                ? 'Tidak ada antrean servis yang siap masuk pit hari ini'
                : activeTab === 'completed_today'
                  ? 'Belum ada servis yang diselesaikan hari ini'
                  : 'Tidak ada servis on progress aktif'}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {searchInput || branchFilter
              ? 'Coba sesuaikan kata kunci pencarian atau filter cabang Anda.'
              : 'Semua booking yang masuk hari pengerjaannya akan otomatis muncul di sini.'}
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Link href="/admin/bookings" className={clsx(btnSecondary, 'h-9 text-xs')}>
              Lihat Kalender Booking
            </Link>
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        /* WORKSHOP PIT CARDS GRID */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayedBookings.map((b) => {
            const isProcessing = b.status === 'diproses';
            const isReady = b.status === 'dikonfirmasi';
            const isCompleted = b.status === 'selesai';
            const cleanPhone = b.customer.phone.replace(/\D/g, '').replace(/^0/, '62');

            return (
              <div
                key={b.id}
                className={clsx(
                  'flex flex-col justify-between rounded-2xl border bg-white p-5 transition-all shadow-sm dark:bg-slate-900',
                  isProcessing
                    ? 'border-blue-300 ring-1 ring-blue-500/20 dark:border-blue-800 dark:ring-blue-500/30'
                    : isReady
                      ? 'border-amber-300/80 hover:border-amber-400 dark:border-amber-900/60'
                      : 'border-slate-200 dark:border-slate-800'
                )}
              >
                <div>
                  {/* Card Header: Plate + Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Plate number={b.vehicle.plate_number} />
                      <p className="mt-1.5 text-sm font-bold text-slate-900 dark:text-white">
                        {b.vehicle.brand} {b.vehicle.model}{' '}
                        {b.vehicle.year ? <span className="text-xs font-normal text-slate-500">({b.vehicle.year})</span> : null}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {isProcessing ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600"></span>
                          </span>
                          Di Pit Workshop
                        </span>
                      ) : isReady ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                          <Clock className="h-3 w-3" />
                          Siap Masuk Pit
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          Selesai
                        </span>
                      )}
                      <span className="font-mono text-[11px] text-slate-400">{bookingCode(b.id)}</span>
                    </div>
                  </div>

                  {/* Customer and Contact Row */}
                  <div className="mt-3.5 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800/50">
                    <div className="min-w-0 pr-2">
                      <p className="truncate font-semibold text-slate-800 dark:text-slate-200">{b.customer.full_name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{b.customer.phone || 'Tanpa no. telepon'}</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {b.customer.phone && (
                        <a
                          href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                            `Halo ${b.customer.full_name}, kami dari tim bengkel ServiceGo mengabarkan bahwa kendaraan ${b.vehicle.brand} ${b.vehicle.model} (${b.vehicle.plate_number}) saat ini ${isProcessing ? 'sedang dalam proses pengerjaan servis di pit' : 'siap untuk diproses servis'}.`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Hubungi Pelanggan via WhatsApp"
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 transition-colors"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <Link
                        href={`/admin/support?customerId=${b.customer.id}&customerName=${encodeURIComponent(b.customer.full_name)}`}
                        title="Buka Chat di Live Support Admin"
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-950/70 dark:text-blue-300 transition-colors"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>

                  {/* Mechanic Assigned */}
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Teknisi / Mekanik:</span>
                    <button
                      type="button"
                      onClick={() => openAssignModal(b)}
                      className="group inline-flex items-center gap-1.5 font-medium text-slate-700 hover:text-primary-600 dark:text-slate-300 dark:hover:text-primary-400"
                    >
                      {b.mechanic ? (
                        <>
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700 dark:bg-primary-900 dark:text-primary-200">
                            {b.mechanic.full_name[0]?.toUpperCase()}
                          </span>
                          <span className="underline decoration-dotted underline-offset-2">
                            {b.mechanic.full_name}
                          </span>
                        </>
                      ) : (
                        <span className="text-amber-600 underline decoration-dashed underline-offset-2 dark:text-amber-400">
                          + Tugaskan Mekanik
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Scheduled info & Branch */}
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Jadwal Booking:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {adminSchedule(b.scheduled_at)}
                    </span>
                  </div>

                  {/* Services list tags */}
                  <div className="mt-3">
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Layanan Servis:</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {b.booking_services.map((s, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {s.service.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Complaint Notes if any */}
                  {b.complaint_notes && (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/60 p-2.5 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                      <span className="font-semibold">Keluhan: </span>
                      {b.complaint_notes}
                    </div>
                  )}

                  {/* DP Uang Hangat Info if paid */}
                  {b.payments?.some((p) => p.payment_type === 'dp' && p.status === 'paid') && (
                    <div className="mt-3 flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50/70 px-2.5 py-1.5 text-xs text-orange-900 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-300">
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <Flame className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                        DP Diterima (Uang Hangat):
                      </span>
                      <span className="font-bold tabular-nums">
                        {formatRp(
                          b.payments
                            .filter((p) => p.payment_type === 'dp' && p.status === 'paid')
                            .reduce((sum, p) => sum + Number(p.amount), 0)
                        )}
                      </span>
                    </div>
                  )}

                  {/* Photos preview thumbnail if any */}
                  {b.photos && b.photos.length > 0 && (
                    <div className="mt-3 flex items-center gap-1.5 overflow-x-auto py-1">
                      <span className="text-[11px] font-medium text-slate-400">Foto ({b.photos.length}):</span>
                      {b.photos.map((p) => (
                        <a
                          key={p.id}
                          href={p.photo_url}
                          target="_blank"
                          rel="noreferrer"
                          title={`${p.stage}: ${p.caption || 'Foto kondisi kendaraan'}`}
                          className="relative h-7 w-7 shrink-0 overflow-hidden rounded border border-slate-200 dark:border-slate-700"
                        >
                          <img src={p.photo_url} alt={p.caption || ''} className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    {/* Primary Workflow Button */}
                    {isReady && (
                      <button
                        type="button"
                        onClick={() => handleStartService(b)}
                        disabled={statusMutation.isPending}
                        className={clsx(
                          btnPrimary,
                          'h-9 flex-1 text-xs font-bold bg-blue-600 hover:bg-blue-700'
                        )}
                      >
                        <PlayCircle className="h-3.5 w-3.5" />
                        Mulai Servis (Masuk Pit)
                      </button>
                    )}

                    {isProcessing && (
                      <button
                        type="button"
                        onClick={() => handleCompleteService(b)}
                        disabled={statusMutation.isPending}
                        className={clsx(
                          btnPrimary,
                          'h-9 flex-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700'
                        )}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Selesaikan Servis
                      </button>
                    )}

                    {/* Camera upload icon */}
                    <button
                      type="button"
                      onClick={() => openPhotoModal(b, isProcessing ? 'checkout' : 'checkin')}
                      title="Unggah Foto Kondisi Kendaraan"
                      className={clsx(btnSecondary, 'h-9 w-9 p-0')}
                    >
                      <Camera className="h-4 w-4" />
                    </button>

                    {/* Detail Sheet Opener */}
                    <button
                      type="button"
                      onClick={() => setDetailBooking(b)}
                      title="Buka Detail Lengkap"
                      className={clsx(btnSecondary, 'h-9 px-2.5 text-xs')}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Detail</span>
                    </button>
                  </div>
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
                <Th>Pelanggan & Kontak</Th>
                <Th>Status Pit</Th>
                <Th>Mekanik Bertugas</Th>
                <Th>Jadwal</Th>
                <Th>Layanan</Th>
                <Th align="right">Aksi</Th>
              </tr>
            </thead>
            <tbody className={tbodyCls}>
              {displayedBookings.map((b) => {
                const isProcessing = b.status === 'diproses';
                const isReady = b.status === 'dikonfirmasi';
                const cleanPhone = b.customer.phone.replace(/\D/g, '').replace(/^0/, '62');

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
                        <div className="mt-1 flex items-center gap-1.5 text-slate-500">
                          <span>{b.customer.phone}</span>
                          {b.customer.phone && (
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 hover:text-emerald-700"
                              title="Chat WhatsApp"
                            >
                              <Phone className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </Td>

                    <Td>
                      {isProcessing ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-ping"></span>
                          Sedang Dikerjakan
                        </span>
                      ) : isReady ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                          Siap Masuk Pit
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                          Selesai
                        </span>
                      )}
                    </Td>

                    <Td>
                      <button
                        type="button"
                        onClick={() => openAssignModal(b)}
                        className="text-left font-medium text-slate-700 hover:text-primary-600 dark:text-slate-300"
                      >
                        {b.mechanic ? (
                          b.mechanic.full_name
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">+ Tugaskan</span>
                        )}
                      </button>
                    </Td>

                    <Td>
                      <span className="text-slate-600 dark:text-slate-400">{adminTime(b.scheduled_at)} WIB</span>
                    </Td>

                    <Td>
                      <span className="truncate max-w-[200px] block" title={b.booking_services.map((s) => s.service.name).join(', ')}>
                        {b.booking_services.map((s) => s.service.name).join(', ')}
                      </span>
                    </Td>

                    <Td align="right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isReady && (
                          <button
                            type="button"
                            onClick={() => handleStartService(b)}
                            disabled={statusMutation.isPending}
                            className="inline-flex h-8 items-center gap-1 rounded-chip bg-blue-600 px-2.5 text-xs font-semibold text-white hover:bg-blue-700"
                          >
                            <PlayCircle className="h-3 w-3" />
                            Mulai
                          </button>
                        )}
                        {isProcessing && (
                          <button
                            type="button"
                            onClick={() => handleCompleteService(b)}
                            disabled={statusMutation.isPending}
                            className="inline-flex h-8 items-center gap-1 rounded-chip bg-emerald-600 px-2.5 text-xs font-semibold text-white hover:bg-emerald-700"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Selesai
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDetailBooking(b)}
                          className={clsx(btnRow, 'h-8 px-2 text-xs')}
                        >
                          Detail
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableCard>
      )}

      {/* MODAL 1: ASSIGN / CHANGE MECHANIC */}
      {assignModalBooking && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Tugaskan Mekanik</h3>
                <p className="text-xs text-slate-500">
                  Untuk {assignModalBooking.vehicle.brand} {assignModalBooking.vehicle.model} ({assignModalBooking.vehicle.plate_number})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalBooking(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2 max-h-64 overflow-y-auto pr-1">
              {mechanicsList.length === 0 ? (
                <p className="text-xs text-slate-500">Tidak ada data mekanik aktif</p>
              ) : (
                mechanicsList.map((m) => {
                  const isSelected = selectedMechanicId === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMechanicId(m.id)}
                      className={clsx(
                        'flex cursor-pointer items-center justify-between rounded-xl border p-3 text-xs transition-colors',
                        isSelected
                          ? 'border-primary-600 bg-primary-50 dark:border-primary-500 dark:bg-primary-950/40'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {m.full_name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{m.full_name}</p>
                          <p className="text-[11px] text-slate-500">{m.specialty || 'Spesialis Umum'}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        {m.active_jobs_count > 0 ? (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            {m.active_jobs_count} mobil aktif
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            Siap ditugaskan
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssignModalBooking(null)}
                className={clsx(btnSecondary, 'h-9 text-xs')}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!selectedMechanicId || assignMutation.isPending}
                onClick={() =>
                  assignMutation.mutate({
                    bookingId: assignModalBooking.id,
                    mechanicId: selectedMechanicId
                  })
                }
                className={clsx(btnPrimary, 'h-9 text-xs')}
              >
                {assignMutation.isPending ? 'Menyimpan...' : 'Simpan Penugasan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: UPLOAD INSPECTION PHOTO */}
      {photoModalBooking && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Unggah Foto Kendaraan</h3>
                <p className="text-xs text-slate-500">
                  {photoModalBooking.vehicle.brand} {photoModalBooking.vehicle.model} ({photoModalBooking.vehicle.plate_number})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPhotoModalBooking(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Tahap Pemeriksaan
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUploadStage('checkin')}
                    className={clsx(
                      'h-9 rounded-ctl border text-xs font-semibold transition-colors',
                      uploadStage === 'checkin'
                        ? 'border-primary-600 bg-primary-50 text-primary-700 dark:border-primary-500 dark:bg-primary-950/50 dark:text-primary-300'
                        : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                    )}
                  >
                    Check-in (Awal Masuk Pit)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadStage('checkout')}
                    className={clsx(
                      'h-9 rounded-ctl border text-xs font-semibold transition-colors',
                      uploadStage === 'checkout'
                        ? 'border-primary-600 bg-primary-50 text-primary-700 dark:border-primary-500 dark:bg-primary-950/50 dark:text-primary-300'
                        : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                    )}
                  >
                    Checkout (Selesai Servis)
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Pilih Berkas Foto (Maks 2 MB)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-chip file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200 dark:file:bg-slate-800 dark:file:text-slate-300"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Catatan Kondisi / Keterangan (Opsional)
                </label>
                <input
                  type="text"
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value)}
                  placeholder="Contoh: Bumper depan baret tipis sebelum servis"
                  className={clsx(inputCls, 'h-9 text-xs')}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPhotoModalBooking(null)}
                className={clsx(btnSecondary, 'h-9 text-xs')}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!uploadFile || isUploadingPhoto}
                onClick={handleUploadPhoto}
                className={clsx(btnPrimary, 'h-9 text-xs')}
              >
                {isUploadingPhoto ? 'Mengunggah...' : 'Unggah Foto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: COMPLETE BOOKING DETAILS */}
      <Sheet open={!!detailBooking} onOpenChange={(open) => !open && setDetailBooking(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-6">
          {detailBooking && (
            <div className="space-y-6">
              <div className="border-b border-slate-200 pb-4 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-slate-500">{bookingCode(detailBooking.id)}</span>
                  <StatusBadge status={detailBooking.status} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <SheetTitle className="text-lg font-bold text-slate-900 dark:text-white">
                    {detailBooking.status === 'selesai'
                      ? 'Detail Servis'
                      : `${detailBooking.vehicle.brand} ${detailBooking.vehicle.model}`}
                  </SheetTitle>
                  <Plate number={detailBooking.vehicle.plate_number} />
                </div>
                <SheetDescription className="mt-1 text-xs text-slate-500">
                  Jadwal: {adminSchedule(detailBooking.scheduled_at)}
                </SheetDescription>
              </div>

              {/* Customer Card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pemilik Kendaraan</p>
                <p className="mt-1 font-bold text-slate-900 dark:text-white">{detailBooking.customer.full_name}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">{detailBooking.customer.phone}</p>
                <p className="text-xs text-slate-500">{detailBooking.customer.email}</p>

                <div className="mt-3 flex gap-2">
                  <a
                    href={`https://wa.me/${detailBooking.customer.phone.replace(/\D/g, '').replace(/^0/, '62')}`}
                    target="_blank"
                    rel="noreferrer"
                    className={clsx(btnSecondary, 'h-8 flex-1 text-xs')}
                  >
                    <Phone className="h-3 w-3 text-emerald-600" />
                    WhatsApp
                  </a>
                  <Link
                    href={`/admin/support?customerId=${detailBooking.customer.id}&customerName=${encodeURIComponent(
                      detailBooking.customer.full_name
                    )}`}
                    className={clsx(btnSecondary, 'h-8 flex-1 text-xs')}
                  >
                    <MessageSquare className="h-3 w-3 text-blue-600" />
                    Live Support
                  </Link>
                </div>
              </div>

              {/* Mechanic Card */}
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Teknisi Bertugas</p>
                  <button
                    type="button"
                    onClick={() => {
                      openAssignModal(detailBooking);
                    }}
                    className="text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400"
                  >
                    Ganti
                  </button>
                </div>
                <p className="mt-1 font-bold text-slate-900 dark:text-white">
                  {detailBooking.mechanic?.full_name || 'Belum ada mekanik'}
                </p>
                {detailBooking.mechanic?.specialty && (
                  <p className="text-xs text-slate-500">{detailBooking.mechanic.specialty}</p>
                )}
              </div>

              {/* Services & Estimated Cost */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Paket Servis Terpilih</p>
                <div className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                  {detailBooking.booking_services.map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 text-xs">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{s.service.name}</p>
                        {s.service.duration_minutes && (
                          <p className="text-[11px] text-slate-500">Estimasi {s.service.duration_minutes} menit</p>
                        )}
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {formatRp(toNumber(s.service.price))}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between bg-slate-50 p-3 text-xs font-semibold dark:bg-slate-800/50">
                    <span className="text-slate-600 dark:text-slate-400">Estimasi Biaya:</span>
                    <span className="text-slate-900 dark:text-white">
                      {formatRp(toNumber(detailBooking.estimated_cost))}
                    </span>
                  </div>
                  {detailBooking.final_cost != null && (
                    <div className="flex items-center justify-between bg-slate-50 px-3 py-2 text-xs font-bold dark:bg-slate-800/50">
                      <span>Biaya Akhir:</span>
                      <span className="text-primary-600 dark:text-primary-400">
                        {formatRp(toNumber(detailBooking.final_cost))}
                      </span>
                    </div>
                  )}
                  {detailBooking.status === 'selesai' && (
                    <>
                      <div className="flex items-center justify-between px-3 py-2 text-xs">
                        <span className="text-slate-600 dark:text-slate-400">Total Dibayar:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
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
                            <div className="flex items-center justify-between bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                              <span>Kembalian:</span>
                              <span>{formatRp(change)}</span>
                            </div>
                          );
                        }
                        if (change < 0) {
                          return (
                            <div className="flex items-center justify-between bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                              <span>Sisa Belum Lunas:</span>
                              <span>{formatRp(Math.abs(change))}</span>
                            </div>
                          );
                        }
                        return (
                          <div className="flex items-center justify-between bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
                            <span>Kembalian:</span>
                            <span>Rp 0 (Lunas Pas)</span>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              </div>

              {/* Photos Gallery */}
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Dokumentasi Foto</p>
                  <button
                    type="button"
                    onClick={() => openPhotoModal(detailBooking)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400"
                  >
                    <Camera className="h-3 w-3" />
                    Tambah Foto
                  </button>
                </div>
                {detailBooking.photos && detailBooking.photos.length > 0 ? (
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
                ) : (
                  <div className="mt-2 rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-800">
                    Belum ada foto check-in / checkout yang diunggah.
                  </div>
                )}
              </div>

              {/* Status History Timeline */}
              {detailBooking.status_history && detailBooking.status_history.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Riwayat Status</p>
                  <div className="mt-2 space-y-2 border-l-2 border-slate-200 pl-3 dark:border-slate-800">
                    {detailBooking.status_history.map((h) => (
                      <div key={h.id} className="relative text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{h.status}</span>
                          <span className="text-[11px] text-slate-400">{adminSchedule(h.changed_at)}</span>
                        </div>
                        {h.note && <p className="text-slate-500">{h.note}</p>}
                        {h.changer && (
                          <p className="text-[11px] text-slate-400">Diubah oleh {h.changer.full_name}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Primary Actions inside Drawer */}
              <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                {detailBooking.status === 'dikonfirmasi' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleStartService(detailBooking);
                      setDetailBooking(null);
                    }}
                    className={clsx(btnPrimary, 'w-full h-10 font-bold bg-blue-600 hover:bg-blue-700')}
                  >
                    <PlayCircle className="h-4 w-4" />
                    Mulai Servis (Masuk Pit)
                  </button>
                )}

                {detailBooking.status === 'diproses' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleCompleteService(detailBooking);
                      setDetailBooking(null);
                    }}
                    className={clsx(btnPrimary, 'w-full h-10 font-bold bg-emerald-600 hover:bg-emerald-700')}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Selesaikan Servis
                  </button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function OnProgressPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={6} cols={5} />}>
      <OnProgressContent />
    </Suspense>
  );
}
