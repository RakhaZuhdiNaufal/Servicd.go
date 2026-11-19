'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Award,
  BarChart2,
  Calendar,
  CheckCircle2,
  Clock,
  Gauge,
  MapPin,
  Sparkles,
  Star,
  TrendingUp,
  UserCheck,
  UserCog,
  Wrench,
  X
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { clsx } from 'clsx';
import { fetcher } from '@/lib/fetcher';
import { formatDate, shortBranchName } from '@/lib/format';
import { Plate } from '@/components/customer/plate';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState, ErrorState } from '@/components/customer/states';
import { useIsDark } from '@/components/admin/charts';
import {
  ActiveBadge,
  AdminPageHeader,
  Initials,
  Pagination,
  SearchInput,
  Segmented,
  TableCard,
  TableSkeleton,
  Td,
  Th,
  btnPrimary,
  btnRow,
  btnSecondary,
  tbodyCls,
  theadCls
} from '@/components/admin/resource-ui';

interface BranchInfo {
  id: string;
  name: string;
  address: string;
  phone: string;
}

interface RecentJob {
  id: string;
  scheduled_at: string;
  status: 'menunggu' | 'dikonfirmasi' | 'diproses' | 'selesai' | 'dibatalkan';
  customer_name: string;
  customer_phone: string | null;
  vehicle_plate: string;
  vehicle_name: string;
  vehicle_type: 'mobil' | 'motor';
  services: string[];
  rating: number | null;
  review_comment: string | null;
}

interface CategoryStat {
  name: string;
  count: number;
  percent: number;
}

interface TrendPoint {
  period: string;
  servis: number;
}

interface MechanicPerformance {
  id: string;
  branch_id: string;
  full_name: string;
  specialty: string;
  is_active: boolean;
  branch: BranchInfo;
  stats: {
    total_completed: number;
    month_completed: number;
    week_completed: number;
    active_jobs: number;
    avg_rating: number | null;
    review_count: number;
  };
  monthly_trend: TrendPoint[];
  weekly_trend: TrendPoint[];
  category_distribution: CategoryStat[];
  recent_jobs: RecentJob[];
}

interface ApiResponseData {
  summary: {
    total_mechanics: number;
    active_mechanics: number;
    completed_this_month: number;
    completed_this_week: number;
    active_jobs: number;
    avg_services_per_mechanic: number;
    top_performer: {
      id: string;
      name: string;
      specialty: string;
      branch_name: string;
      month_completed: number;
      avg_rating: number | null;
    } | null;
  };
  mechanics: MechanicPerformance[];
}

interface Branch {
  id: string;
  name: string;
}

const PAGE_SIZE = 15;

const STATUS_OPTIONS: Array<{ value: '' | 'active' | 'inactive'; label: string }> = [
  { value: '', label: 'Semua Status' },
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Nonaktif' }
];

export default function MechanicPerformancePage() {
  const isDark = useIsDark();
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive'>('');
  const [page, setPage] = useState(1);
  const [selectedMechanic, setSelectedMechanic] = useState<MechanicPerformance | null>(null);

  const { data: response, isLoading, isError, error, refetch } = useQuery<ApiResponseData>({
    queryKey: ['admin-mechanic-performance', branchFilter, statusFilter, search],
    queryFn: () => {
      const p = new URLSearchParams();
      if (branchFilter) p.set('branch_id', branchFilter);
      if (statusFilter) p.set('is_active', statusFilter === 'active' ? 'true' : 'false');
      if (search) p.set('search', search);
      const q = p.toString();
      return fetcher(`/admin/mechanics/performance${q ? `?${q}` : ''}`);
    }
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: () => fetcher('/branches')
  });

  const summary = response?.summary;
  const rawList = response?.mechanics ?? [];

  const totalPages = Math.max(1, Math.ceil(rawList.length / PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return rawList.slice(start, start + PAGE_SIZE);
  }, [rawList, page]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  }

  function resetFilters() {
    setSearch('');
    setSearchInput('');
    setBranchFilter('');
    setStatusFilter('');
    setPage(1);
  }

  const hasFilter = !!search || !!branchFilter || !!statusFilter;

  return (
    <div className="space-y-6">
      <style jsx global>{`
        @keyframes sgModalIn {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(12px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .sg-modal-animated {
          animation: sgModalIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>

      {/* Page Header */}
      <AdminPageHeader
        title="Performa & Analitik Mekanik"
        description="Pantau tren servis mobil/motor mingguan dan bulanan, tingkat penyelesaian kerja, dan kepuasan pelanggan tiap mekanik bengkel."
      />

      {/* Navigasi Tab Mekanik */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <Link
          href="/admin/mechanics"
          className="border-b-2 border-transparent px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          Kelola &amp; Daftar Mekanik
        </Link>
        <Link
          href="/admin/mechanics/performance"
          className="border-b-2 border-primary-600 px-4 py-2 text-sm font-bold text-primary-700 dark:border-primary-500 dark:text-primary-400"
        >
          Performa &amp; Analitik Kinerja
        </Link>
      </div>

      {/* Telemetry Summary Cards (Mirip halaman kendaraan) */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {/* Card 1: Total Mekanik Aktif */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Mekanik Bertugas
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-transform duration-200 group-hover:scale-110 dark:bg-blue-950/40 dark:text-blue-400">
              <UserCheck className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2.5 text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">
            {summary?.active_mechanics ?? 0} <span className="text-sm font-medium text-slate-500">aktif</span>
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Dari total {summary?.total_mechanics ?? 0} staf mekanik
          </p>
        </div>

        {/* Card 2: Servis Selesai Bulan Ini */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Selesai Bulan Ini
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform duration-200 group-hover:scale-110 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2.5 text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">
            {summary?.completed_this_month ?? 0} <span className="text-sm font-medium text-slate-500">servis</span>
          </p>
          <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/80">
            {summary?.completed_this_week ?? 0} servis selesai minggu ini
          </p>
        </div>

        {/* Card 3: Rata-rata Beban Kerja */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Rata-rata / Mekanik
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600 transition-transform duration-200 group-hover:scale-110 dark:bg-purple-950/40 dark:text-purple-400">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2.5 text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">
            {summary?.avg_services_per_mechanic ?? 0}{' '}
            <span className="text-sm font-medium text-slate-500">servis/bln</span>
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {summary?.active_jobs ?? 0} pekerjaan sedang dikerjakan saat ini
          </p>
        </div>

        {/* Card 4: Top Performer */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Mekanik Terbaik
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 transition-transform duration-200 group-hover:scale-110 dark:bg-amber-950/40 dark:text-amber-400">
              <Award className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2.5 truncate text-xl font-extrabold text-slate-900 dark:text-white">
            {summary?.top_performer?.name || '-'}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>{summary?.top_performer?.month_completed ?? 0} servis</span>
            {summary?.top_performer?.avg_rating && (
              <>
                <span>•</span>
                <span className="flex items-center text-amber-600 dark:text-amber-400">
                  <Star className="mr-0.5 h-3 w-3 fill-amber-400" />
                  {summary.top_performer.avg_rating}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <form onSubmit={submitSearch} role="search" className="flex flex-1 flex-wrap items-center gap-2">
          <SearchInput
            id="mechanic-perf-search"
            label="Cari mekanik"
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Cari nama mekanik, spesialisasi, atau cabang"
          />
          <button type="submit" className={btnSecondary}>
            Cari
          </button>

          {/* Filter Cabang */}
          <select
            value={branchFilter}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Pilih cabang"
            className="h-10 rounded-ctl border border-slate-300 bg-white px-3 text-sm text-slate-700 transition-colors focus:border-primary-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="">Semua cabang</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {shortBranchName(b.name)}
              </option>
            ))}
          </select>

          {hasFilter && (
            <button type="button" onClick={resetFilters} className={btnRow}>
              Reset filter
            </button>
          )}
        </form>

        <Segmented
          label="Status keaktifan"
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        />
      </div>

      {/* Tabel Kinerja Mekanik */}
      {isLoading ? (
        <TableSkeleton cols={8} />
      ) : isError ? (
        <ErrorState
          title="Gagal memuat data kinerja mekanik"
          message={(error as Error)?.message}
          onRetry={() => refetch()}
        />
      ) : rawList.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="Tidak ada mekanik yang cocok"
          description={
            hasFilter
              ? 'Tidak ada data mekanik yang sesuai dengan filter pencarian.'
              : 'Belum ada data staf mekanik yang terdaftar di sistem.'
          }
          action={hasFilter ? { label: 'Reset filter', onClick: resetFilters } : undefined}
        />
      ) : (
        <TableCard
          footer={
            totalPages > 1 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                total={rawList.length}
                unit="mekanik"
                onChange={setPage}
              />
            )
          }
        >
          <table className="w-full text-left text-sm">
            <thead className={theadCls}>
              <tr>
                <Th>Mekanik</Th>
                <Th>Cabang</Th>
                <Th className="text-center">Minggu Ini</Th>
                <Th className="text-center">Bulan Ini</Th>
                <Th className="text-center">Total Selesai</Th>
                <Th className="text-center">Sedang Kerja</Th>
                <Th>Rating Pelanggan</Th>
                <Th>Status</Th>
                <Th className="text-right">Aksi</Th>
              </tr>
            </thead>
            <tbody className={tbodyCls}>
              {paginated.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => setSelectedMechanic(m)}
                  className="group cursor-pointer transition-colors hover:bg-slate-50/90 dark:hover:bg-slate-800/60"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedMechanic(m);
                    }
                  }}
                  aria-label={`Buka detail kinerja ${m.full_name}`}
                >
                  <Td>
                    <div className="flex items-center gap-3">
                      <Initials name={m.full_name} />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400 transition-colors">
                          {m.full_name}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{m.specialty}</p>
                      </div>
                    </div>
                  </Td>

                  <Td>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {shortBranchName(m.branch?.name || '-')}
                    </span>
                  </Td>

                  <Td className="text-center">
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                      {m.stats.week_completed}
                    </span>
                  </Td>

                  <Td className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-0.5 font-mono text-xs font-extrabold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {m.stats.month_completed} servis
                      </span>
                    </div>
                  </Td>

                  <Td className="text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                    {m.stats.total_completed}
                  </Td>

                  <Td className="text-center">
                    {m.stats.active_jobs > 0 ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                        {m.stats.active_jobs} aktif
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">0</span>
                    )}
                  </Td>

                  <Td>
                    {m.stats.avg_rating ? (
                      <div className="flex items-center gap-1.5">
                        <span className="flex items-center font-bold text-amber-600 dark:text-amber-400">
                          <Star className="mr-1 h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                          {m.stats.avg_rating}
                        </span>
                        <span className="text-xs text-slate-400">({m.stats.review_count})</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Belum ada</span>
                    )}
                  </Td>

                  <Td>
                    <ActiveBadge active={m.is_active} />
                  </Td>

                  <Td className="text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMechanic(m);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-primary-700 shadow-sm transition-all hover:border-primary-300 hover:bg-primary-50 dark:border-slate-700 dark:bg-slate-800 dark:text-primary-300 dark:hover:bg-slate-700"
                    >
                      <BarChart2 className="h-3.5 w-3.5" />
                      Detail Kinerja
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}

      {/* MODAL BESAR DI TENGAH: DETAIL KINERJA MEKANIK */}
      {selectedMechanic && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="mechanic-perf-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
          onClick={() => setSelectedMechanic(null)}
        >
          <div
            className="sg-modal-animated relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 p-5 sm:px-7 sm:py-5 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Initials name={selectedMechanic.full_name} />
                  <span
                    className={clsx(
                      'absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900',
                      selectedMechanic.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                    )}
                  />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 id="mechanic-perf-title" className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                      {selectedMechanic.full_name}
                    </h2>
                    <ActiveBadge active={selectedMechanic.is_active} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                      <Wrench className="h-3.5 w-3.5 text-primary-600" />
                      {selectedMechanic.specialty}
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {selectedMechanic.branch?.name}
                    </span>
                    {selectedMechanic.stats.avg_rating && (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center font-bold text-amber-600 dark:text-amber-400">
                          <Star className="mr-1 h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                          {selectedMechanic.stats.avg_rating} ({selectedMechanic.stats.review_count} ulasan)
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMechanic(null)}
                aria-label="Tutup jendela performa"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-7">
              {/* 4 Kartu KPI Kinerja Mekanik */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Minggu Ini
                  </p>
                  <p className="mt-1.5 text-2xl font-extrabold text-slate-900 dark:text-white">
                    {selectedMechanic.stats.week_completed}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">Servis selesai</p>
                </div>

                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Bulan Ini
                  </p>
                  <p className="mt-1.5 text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">
                    {selectedMechanic.stats.month_completed}
                  </p>
                  <p className="mt-0.5 text-xs text-emerald-600/80">Servis selesai</p>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Total Selesai
                  </p>
                  <p className="mt-1.5 text-2xl font-extrabold text-slate-900 dark:text-white">
                    {selectedMechanic.stats.total_completed}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">Sepanjang masa</p>
                </div>

                <div className="rounded-2xl border border-blue-200/80 bg-blue-50/50 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                    Sedang Dikerjakan
                  </p>
                  <p className="mt-1.5 text-2xl font-extrabold text-blue-700 dark:text-blue-400">
                    {selectedMechanic.stats.active_jobs}
                  </p>
                  <p className="mt-0.5 text-xs text-blue-600/80">Slot aktif pit</p>
                </div>
              </div>

              {/* Seksi Grafik Tren Animasi */}
              <MechanicChartSection mechanic={selectedMechanic} isDark={isDark} />

              {/* Grid 2 Kolom: Kategori Layanan & Ringkasan Keahlian */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {/* Kolom 1: Distribusi Layanan */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Distribusi Kategori Layanan
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Proporsi jenis servis mobil/motor yang dikerjakan mekanik ini.
                  </p>

                  <div className="mt-4 space-y-3.5">
                    {selectedMechanic.category_distribution.length === 0 ? (
                      <p className="py-6 text-center text-xs text-slate-400">Belum ada riwayat kategori servis.</p>
                    ) : (
                      selectedMechanic.category_distribution.map((cat) => (
                        <div key={cat.name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{cat.name}</span>
                            <span className="font-mono text-slate-500 dark:text-slate-400">
                              {cat.count} servis ({cat.percent}%)
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className="h-full rounded-full bg-primary-600 transition-all duration-500 dark:bg-primary-500"
                              style={{ width: `${cat.percent}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Kolom 2: Info Kontak & Penempatan */}
                <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Informasi Penugasan
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Basis operasional bengkel dan spesialisasi teknis.
                    </p>

                    <dl className="mt-4 divide-y divide-slate-100 text-xs dark:divide-slate-800/80">
                      <div className="flex justify-between py-2.5">
                        <dt className="text-slate-500">Cabang Penempatan</dt>
                        <dd className="font-semibold text-slate-800 dark:text-slate-200">
                          {selectedMechanic.branch?.name || '-'}
                        </dd>
                      </div>
                      <div className="flex justify-between py-2.5">
                        <dt className="text-slate-500">Alamat Cabang</dt>
                        <dd className="max-w-[220px] text-right text-slate-600 dark:text-slate-400">
                          {selectedMechanic.branch?.address || '-'}
                        </dd>
                      </div>
                      <div className="flex justify-between py-2.5">
                        <dt className="text-slate-500">Spesialisasi Utama</dt>
                        <dd className="font-semibold text-primary-700 dark:text-primary-400">
                          {selectedMechanic.specialty}
                        </dd>
                      </div>
                      <div className="flex justify-between py-2.5">
                        <dt className="text-slate-500">Total Ulasan Diterima</dt>
                        <dd className="font-semibold text-slate-800 dark:text-slate-200">
                          {selectedMechanic.stats.review_count} ulasan
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                    💡 <span className="font-semibold">Catatan Supervisi:</span> Mekanik aktif dapat ditugaskan langsung
                    pada formulir booking pelanggan saat status booking dikonfirmasi oleh admin.
                  </div>
                </div>
              </div>

              {/* Tabel Riwayat Servis Terakhir */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Riwayat Servis Terbaru
                  </h3>
                  <span className="text-xs text-slate-500">15 pengerjaan terakhir</span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                  <table className="w-full text-left text-xs">
                    <thead className={theadCls}>
                      <tr>
                        <Th className="text-xs">Tanggal</Th>
                        <Th className="text-xs">Kendaraan</Th>
                        <Th className="text-xs">Pelanggan</Th>
                        <Th className="text-xs">Layanan Dikerjakan</Th>
                        <Th className="text-xs">Status</Th>
                        <Th className="text-xs">Ulasan</Th>
                      </tr>
                    </thead>
                    <tbody className={tbodyCls}>
                      {selectedMechanic.recent_jobs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            Belum ada riwayat booking yang ditugaskan ke mekanik ini.
                          </td>
                        </tr>
                      ) : (
                        selectedMechanic.recent_jobs.map((job) => (
                          <tr key={job.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <Td className="whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                              {formatDate(job.scheduled_at, {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Td>

                            <Td>
                              <div className="flex items-center gap-2">
                                <Plate number={job.vehicle_plate} size="sm" />
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {job.vehicle_name}
                                </span>
                              </div>
                            </Td>

                            <Td>
                              <span className="text-slate-800 dark:text-slate-200">{job.customer_name}</span>
                            </Td>

                            <Td>
                              <div className="flex max-w-[200px] flex-wrap gap-1">
                                {job.services.map((svc) => (
                                  <span
                                    key={svc}
                                    className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                  >
                                    {svc}
                                  </span>
                                ))}
                              </div>
                            </Td>

                            <Td>
                              <StatusBadge status={job.status} />
                            </Td>

                            <Td>
                              {job.rating ? (
                                <div className="space-y-0.5">
                                  <span className="flex items-center font-bold text-amber-600 dark:text-amber-400">
                                    <Star className="mr-1 h-3 w-3 fill-amber-400 text-amber-500" />
                                    {job.rating} / 5
                                  </span>
                                  {job.review_comment && (
                                    <p className="line-clamp-1 max-w-[150px] text-[11px] italic text-slate-500">
                                      &ldquo;{job.review_comment}&rdquo;
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </Td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                ID Mekanik: <code className="font-mono text-slate-700 dark:text-slate-300">{selectedMechanic.id}</code>
              </span>
              <div className="flex items-center gap-2">
                <Link href="/admin/mechanics" className={btnSecondary}>
                  Ubah di Daftar Mekanik
                </Link>
                <button type="button" onClick={() => setSelectedMechanic(null)} className={btnPrimary}>
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Komponen Grafik Animasi Recharts di Dalam Modal
// ---------------------------------------------------------------------------

function MechanicChartSection({
  mechanic,
  isDark
}: {
  mechanic: MechanicPerformance;
  isDark: boolean;
}) {
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly'>('monthly');

  const chartData = viewMode === 'monthly' ? mechanic.monthly_trend : mechanic.weekly_trend;

  const strokeColor = isDark ? '#60A5FA' : '#2563EB';
  const fillColor = isDark ? '#3B82F6' : '#93C5FD';
  const gridColor = isDark ? '#1E293B' : '#E2E8F0';
  const axisColor = isDark ? '#94A3B8' : '#64748B';

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Grafik Tren Servis Mobil &amp; Motor
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {viewMode === 'monthly'
              ? 'Volume pengerjaan servis dalam 6 bulan kalender terakhir'
              : 'Aktivitas harian dalam 7 hari terakhir'}
          </p>
        </div>

        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('monthly')}
            className={clsx(
              'rounded-lg px-3 py-1 text-xs font-semibold transition-colors',
              viewMode === 'monthly'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            )}
          >
            Bulanan (6 Bln)
          </button>
          <button
            type="button"
            onClick={() => setViewMode('weekly')}
            className={clsx(
              'rounded-lg px-3 py-1 text-xs font-semibold transition-colors',
              viewMode === 'weekly'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            )}
          >
            Harian (7 Hari)
          </button>
        </div>
      </div>

      <div className="mt-6 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorServis" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={fillColor} stopOpacity={0.65} />
                <stop offset="95%" stopColor={fillColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="period"
              stroke={axisColor}
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke={axisColor}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
                      <p className="mt-1 text-base font-extrabold text-primary-600 dark:text-primary-400">
                        {payload[0].value} <span className="text-xs font-medium text-slate-600 dark:text-slate-300">servis selesai</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="servis"
              stroke={strokeColor}
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorServis)"
              isAnimationActive={true}
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
