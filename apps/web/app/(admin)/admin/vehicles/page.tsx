'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Bike,
  Calendar,
  Car,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Edit3,
  Gauge,
  History,
  Mail,
  MessageSquareShare,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
  Ticket,
  User,
  Wrench,
  X
} from 'lucide-react';
import { clsx } from 'clsx';
import { promoSummary, type PromoDTO } from '@servicego/shared';
import { fetcher } from '@/lib/fetcher';
import { formatDate, formatRp } from '@/lib/format';
import { Plate } from '@/components/customer/plate';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState, ErrorState } from '@/components/customer/states';
import {
  AdminPageHeader,
  Pagination,
  SearchInput,
  Segmented,
  TableCard,
  TableSkeleton,
  Td,
  Th,
  btnRow,
  btnSecondary,
  tbodyCls,
  theadCls
} from '@/components/admin/resource-ui';

type BookingStatus = 'menunggu' | 'dikonfirmasi' | 'diproses' | 'selesai' | 'dibatalkan';
type TypeFilter = '' | 'mobil' | 'motor';

interface ServiceHistoryItem {
  id: string;
  scheduled_at: string;
  status: string;
  odometer_km: number | null;
  service_names: string[];
  notes: string | null;
}

interface Vehicle {
  id: string;
  owner_id: string;
  plate_number: string;
  brand: string;
  model: string;
  year: number;
  vehicle_type: 'mobil' | 'motor';
  last_odometer_km: number;
  last_service_odometer_km: number | null;
  last_service_date: string | null;
  created_at: string;
  total_bookings: number;
  completed_bookings: number;
  owner: {
    id: string;
    auth_user_id?: string | null;
    full_name: string;
    phone: string;
    email: string;
    avatar_url: string | null;
  };
  last_booking: {
    id: string;
    status: string;
    scheduled_at: string;
    odometer_km: number | null;
    service_summary: string | null;
  } | null;
  service_history?: ServiceHistoryItem[];
}

interface ListResponse {
  vehicles: Vehicle[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

interface PromoListResponse {
  promos: Array<PromoDTO & { state: string }>;
}

const SERVICE_INTERVAL_KM = 30000;

const TYPE_OPTIONS: Array<{ value: TypeFilter; label: string }> = [
  { value: '', label: 'Semua' },
  { value: 'mobil', label: 'Mobil' },
  { value: 'motor', label: 'Motor' }
];

const shortDate = (iso: string) => formatDate(iso, { day: 'numeric', month: 'short', year: 'numeric' });

function getOdometerTelemetry(v: Vehicle) {
  const lastServiceOdo = v.last_service_odometer_km ?? v.last_booking?.odometer_km ?? 0;
  const currentOdo = v.last_odometer_km ?? 0;
  const deltaKm = Math.max(0, currentOdo - lastServiceOdo);
  const nextTargetOdo = lastServiceOdo + SERVICE_INTERVAL_KM;
  const remainingKm = Math.max(0, nextTargetOdo - currentOdo);
  const progressPct = Math.min(100, Math.round((deltaKm / SERVICE_INTERVAL_KM) * 100));
  const isDue = deltaKm >= SERVICE_INTERVAL_KM;
  const isApproaching = !isDue && deltaKm >= SERVICE_INTERVAL_KM * 0.8;

  return {
    lastServiceOdo,
    currentOdo,
    deltaKm,
    nextTargetOdo,
    remainingKm,
    progressPct,
    isDue,
    isApproaching
  };
}

function buildReminderTemplate(v: Vehicle, promo?: PromoDTO | null) {
  const t = getOdometerTelemetry(v);
  const lastServiceInfo = v.last_service_date
    ? ` (${shortDate(v.last_service_date)})`
    : '';

  const promoBlock = promo
    ? `🎁 *Penawaran Spesial Untukmu — ${promo.title}:*\nGunakan kode voucher *${promo.code}* saat booking di aplikasi ServiceGo untuk mendapatkan *${promoSummary(promo)}*${promo.min_spend ? ` (min. transaksi ${formatRp(promo.min_spend)})` : ''}.`
    : `🎁 *Penawaran Spesial Untukmu:*\nBooking jadwal servis berkala di aplikasi *ServiceGo* sekarang dan nikmati pengecekan multi-titik gratis bersama teknisi tersertifikasi kami.`;

  return `Halo Kak ${v.owner.full_name} 👋

Kami dari tim *ServiceGo* mau ngingetin jadwal perawatan berkala untuk kendaraan *${v.brand} ${v.model}* (${v.plate_number}).

📊 *Catatan Odometer Kendaraan:*
• Odometer servis terakhir${lastServiceInfo}: ${t.lastServiceOdo.toLocaleString('id-ID')} km
• Odometer saat ini: *${t.currentOdo.toLocaleString('id-ID')} km*
• Penambahan jarak tempuh: *+${t.deltaKm.toLocaleString('id-ID')} km*

Karena jarak tempuh kendaraan sudah bertambah *${t.deltaKm.toLocaleString('id-ID')} km* sejak servis terakhir, performa oli mesin, filter udara, kampas rem, dan komponen kaki-kaki sangat disarankan untuk dicek ulang supaya tarikan tetap enteng, irit bahan bakar, dan aman dipakai harian.

${promoBlock}

Yuk amankan slot jam servis kamu di ServiceGo sebelum antrean bengkel penuh. Balas pesan ini kalau mau dibantu atur jadwalnya ya!`;
}

export default function VehiclesPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('');
  const [onlyDue30k, setOnlyDue30k] = useState(false);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedVoucherCode, setSelectedVoucherCode] = useState<string>('');
  const [customMessage, setCustomMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // State untuk update cepat odometer di dalam detail drawer
  const [editingOdo, setEditingOdo] = useState(false);
  const [odoInput, setOdoInput] = useState('');

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<ListResponse>({
    queryKey: ['admin-vehicles', page, search, typeFilter],
    queryFn: () =>
      fetcher(
        `/admin/vehicles?page=${page}&limit=15${
          search ? `&search=${encodeURIComponent(search)}` : ''
        }${typeFilter ? `&vehicle_type=${typeFilter}` : ''}`
      )
  });

  // Ambil daftar voucher aktif langsung dari database
  const { data: promoData } = useQuery<PromoListResponse>({
    queryKey: ['admin-promos-aktif-for-vehicles'],
    queryFn: () => fetcher('/admin/promos?status=aktif')
  });

  const activePromos = promoData?.promos ?? [];
  const rawVehicles = data?.vehicles ?? [];

  const selectedVehicle = useMemo(
    () => rawVehicles.find((v) => v.id === selectedVehicleId) ?? null,
    [rawVehicles, selectedVehicleId]
  );

  // Set default voucher ke voucher aktif pertama dari database
  useEffect(() => {
    if (activePromos.length > 0 && !activePromos.some((p) => p.code === selectedVoucherCode)) {
      setSelectedVoucherCode(activePromos[0].code);
    }
  }, [activePromos, selectedVoucherCode]);

  // Regenerate draft pesan saat kendaraan atau voucher berubah
  useEffect(() => {
    if (!selectedVehicle) return;
    const chosenPromo = activePromos.find((p) => p.code === selectedVoucherCode) ?? null;
    setCustomMessage(buildReminderTemplate(selectedVehicle, chosenPromo));
    setCopied(false);
  }, [selectedVehicle, selectedVoucherCode, activePromos]);

  useEffect(() => {
    if (!selectedVehicle) {
      setEditingOdo(false);
      return;
    }
    setOdoInput(String(selectedVehicle.last_odometer_km ?? 0));
    setEditingOdo(false);
  }, [selectedVehicle?.id]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelectedVehicleId(null);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const updateOdoMutation = useMutation({
    mutationFn: ({ id, last_odometer_km }: { id: string; last_odometer_km: number }) =>
      fetcher(`/vehicles/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ last_odometer_km })
      }),
    onSuccess: () => {
      toast.success('Odometer kendaraan berhasil diperbarui');
      setEditingOdo(false);
      qc.invalidateQueries({ queryKey: ['admin-vehicles'] });
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const stats = useMemo(() => {
    let dueCount = 0;
    let approachingCount = 0;
    let totalOdo = 0;

    rawVehicles.forEach((v) => {
      const t = getOdometerTelemetry(v);
      if (t.isDue) dueCount += 1;
      else if (t.isApproaching) approachingCount += 1;
      totalOdo += t.currentOdo;
    });

    return {
      total: data?.meta.total ?? rawVehicles.length,
      dueCount,
      approachingCount,
      avgOdo: rawVehicles.length > 0 ? Math.round(totalOdo / rawVehicles.length) : 0
    };
  }, [rawVehicles, data?.meta.total]);

  const vehicles = useMemo(() => {
    if (!onlyDue30k) return rawVehicles;
    return rawVehicles.filter((v) => getOdometerTelemetry(v).isDue);
  }, [rawVehicles, onlyDue30k]);

  const filtered = !!search || !!typeFilter || onlyDue30k;

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  }

  function resetFilters() {
    setSearch('');
    setSearchInput('');
    setTypeFilter('');
    setOnlyDue30k(false);
    setPage(1);
  }

  function handleSaveOdo(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVehicle) return;
    const parsed = Number(odoInput);
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error('Masukkan angka odometer yang valid');
      return;
    }
    updateOdoMutation.mutate({ id: selectedVehicle.id, last_odometer_km: Math.round(parsed) });
  }

  function handleSendToLiveSupport(v: Vehicle) {
    const params = new URLSearchParams({
      customerId: v.owner.id,
      ...(v.owner.auth_user_id ? { authUserId: v.owner.auth_user_id } : {}),
      ...(v.owner.email ? { customerEmail: v.owner.email } : {}),
      ...(v.owner.full_name ? { customerName: v.owner.full_name } : {}),
      plate: v.plate_number,
      prefill: customMessage
    });

    router.push(`/admin/support?${params.toString()}`);
  }

  async function handleCopyMessage() {
    try {
      await navigator.clipboard.writeText(customMessage);
      setCopied(true);
      toast.success('Pesan pengingat berhasil disalin');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Gagal menyalin pesan');
    }
  }

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes sgFadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes sgDrawerIn {
          from {
            opacity: 0;
            transform: translateX(32px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .sg-animate-row {
          animation: sgFadeSlideUp 0.36s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .sg-drawer-panel {
          animation: sgDrawerIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>

      <AdminPageHeader
        title="Kendaraan"
        description="Pantau seluruh armada pelanggan, riwayat odometer servis, dan kirim pengingat berkala +30.000 km beserta voucher ke Live Support."
      />

      {/* Telemetry Summary Cards */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => setOnlyDue30k(false)}
          style={{ animationDelay: '0ms' }}
          className={clsx(
            'sg-animate-row group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
            !onlyDue30k
              ? 'border-slate-300 bg-white ring-2 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-900'
              : 'border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Armada
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-transform duration-200 group-hover:scale-110 dark:bg-slate-800 dark:text-slate-200">
              <Car className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2.5 text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">
            {stats.total.toLocaleString('id-ID')}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Mobil &amp; motor terdaftar</p>
        </button>

        <button
          type="button"
          onClick={() => setOnlyDue30k((prev) => !prev)}
          style={{ animationDelay: '60ms' }}
          className={clsx(
            'sg-animate-row group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
            onlyDue30k
              ? 'border-primary-600 bg-primary-50/80 ring-2 ring-primary-600/20 dark:border-primary-500 dark:bg-primary-950/35'
              : stats.dueCount > 0
                ? 'border-primary-300 bg-primary-50/40 dark:border-primary-500/40 dark:bg-primary-950/20'
                : 'border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-700 dark:text-primary-400">
              Waktunya Servis (+30k)
            </span>
            <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400">
              {stats.dueCount > 0 && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-xl bg-primary-400 opacity-25" />
              )}
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2.5 text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">
            {stats.dueCount} <span className="text-sm font-medium text-slate-500">unit</span>
          </p>
          <p className="mt-1 text-xs text-primary-700/90 dark:text-primary-300/80">
            {onlyDue30k ? 'Filter +30k aktif (klik untuk semua)' : 'Klik untuk saring kendaraan +30k'}
          </p>
        </button>

        <div
          style={{ animationDelay: '120ms' }}
          className="sg-animate-row group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Mendekati 30.000 km
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-600 transition-transform duration-200 group-hover:scale-110 dark:bg-amber-500/20 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2.5 text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">
            {stats.approachingCount} <span className="text-sm font-medium text-slate-500">unit</span>
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Interval 24.000 – 29.999 km</p>
        </div>

        <div
          style={{ animationDelay: '180ms' }}
          className="sg-animate-row group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Rata-rata Odometer
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 transition-transform duration-200 group-hover:scale-110 dark:bg-emerald-500/20 dark:text-emerald-400">
              <Gauge className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2.5 text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">
            {stats.avgOdo.toLocaleString('id-ID')} <span className="text-sm font-medium text-slate-500">km</span>
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Klik baris untuk inspeksi detail</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <form onSubmit={submitSearch} role="search" className="flex flex-1 flex-wrap items-center gap-2">
          <SearchInput
            id="vehicle-search"
            label="Cari kendaraan"
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Cari plat, merek, model, atau pemilik"
          />
          <button type="submit" className={btnSecondary}>
            Cari
          </button>
          {filtered && (
            <button type="button" onClick={resetFilters} className={btnRow}>
              Reset filter
            </button>
          )}
        </form>
        <Segmented
          label="Tipe kendaraan"
          value={typeFilter}
          options={TYPE_OPTIONS}
          onChange={(v) => {
            setTypeFilter(v);
            setPage(1);
          }}
        />
      </div>

      {/* Table / List */}
      {isLoading ? (
        <TableSkeleton cols={7} />
      ) : isError ? (
        <ErrorState
          title="Daftar kendaraan belum bisa dimuat"
          message={(error as Error)?.message}
          onRetry={() => refetch()}
        />
      ) : vehicles.length === 0 ? (
        <EmptyState
          icon={Car}
          title={filtered ? 'Tidak ada kendaraan yang cocok' : 'Belum ada kendaraan terdaftar'}
          description={
            filtered
              ? 'Coba kata kunci lain atau tampilkan semua kendaraan.'
              : 'Kendaraan muncul di sini setelah pelanggan menambahkannya di aplikasi.'
          }
          action={filtered ? { label: 'Reset filter', onClick: resetFilters } : undefined}
        />
      ) : (
        <TableCard
          footer={
            data && (
              <Pagination
                page={page}
                totalPages={data.meta.total_pages}
                total={data.meta.total}
                unit="kendaraan"
                onChange={setPage}
              />
            )
          }
        >
          <div aria-busy={isFetching} className={isFetching ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
            <table className="hidden w-full text-sm lg:table">
              <thead className={theadCls}>
                <tr>
                  <Th>Plat nomor</Th>
                  <Th>Kendaraan</Th>
                  <Th>Pemilik</Th>
                  <Th align="right">Odometer &amp; Interval +30k</Th>
                  <Th align="right">Servis</Th>
                  <Th>Servis terakhir</Th>
                  <Th align="right">Detail</Th>
                </tr>
              </thead>
              <tbody className={tbodyCls}>
                {vehicles.map((v, idx) => {
                  const telemetry = getOdometerTelemetry(v);
                  const isSelected = selectedVehicle?.id === v.id;

                  return (
                    <tr
                      key={v.id}
                      onClick={() => setSelectedVehicleId(v.id)}
                      style={{ animationDelay: `${Math.min(idx * 35, 320)}ms` }}
                      className={clsx(
                        'sg-animate-row group cursor-pointer transition-all duration-150',
                        isSelected
                          ? 'bg-primary-50/70 dark:bg-primary-950/30'
                          : 'hover:bg-slate-50/90 dark:hover:bg-slate-800/60'
                      )}
                    >
                      <Td>
                        <div className="transition-transform duration-200 group-hover:scale-[1.03]">
                          <Plate number={v.plate_number} size="md" />
                        </div>
                      </Td>

                      <Td>
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {v.vehicle_type === 'mobil' ? (
                              <Car className="h-4 w-4" />
                            ) : (
                              <Bike className="h-4 w-4" />
                            )}
                          </span>
                          <div>
                            <p className="font-semibold capitalize text-slate-900 dark:text-white">
                              {v.brand} {v.model}
                            </p>
                            <p className="text-[12px] text-slate-500 dark:text-slate-400">
                              {v.year} · {v.vehicle_type === 'mobil' ? 'Mobil' : 'Motor'}
                            </p>
                          </div>
                        </div>
                      </Td>

                      <Td>
                        <p className="font-medium text-slate-900 dark:text-white">{v.owner.full_name}</p>
                        <p className="text-[12px] tabular-nums text-slate-500 dark:text-slate-400">
                          {v.owner.phone || v.owner.email}
                        </p>
                      </Td>

                      <Td align="right" className="whitespace-nowrap">
                        <div className="ml-auto max-w-[195px] space-y-1.5">
                          <div className="flex items-center justify-end gap-1.5">
                            {telemetry.isDue && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-bold text-primary-700 dark:bg-primary-500/20 dark:text-primary-300">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-600 dark:bg-primary-400" />
                                +30k km
                              </span>
                            )}
                            <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                              {telemetry.currentOdo.toLocaleString('id-ID')} km
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              style={{ width: `${telemetry.progressPct}%` }}
                              className={clsx(
                                'h-full rounded-full transition-all duration-500',
                                telemetry.isDue
                                  ? 'bg-primary-600'
                                  : telemetry.isApproaching
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                              )}
                            />
                          </div>
                          <p className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                            Servis trk: {telemetry.lastServiceOdo.toLocaleString('id-ID')} km
                          </p>
                        </div>
                      </Td>

                      <Td align="right" className="tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                        {v.total_bookings}x
                      </Td>

                      <Td>
                        {v.last_booking ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="whitespace-nowrap text-slate-700 dark:text-slate-300">
                              {shortDate(v.last_booking.scheduled_at)}
                            </span>
                            <StatusBadge status={v.last_booking.status as BookingStatus} size="sm" />
                          </div>
                        ) : (
                          <span className="text-[13px] text-slate-500 dark:text-slate-400">Belum pernah servis</span>
                        )}
                      </Td>

                      <Td align="right">
                        <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition-all group-hover:bg-white group-hover:text-primary-600 group-hover:shadow-xs dark:text-slate-400 dark:group-hover:bg-slate-800 dark:group-hover:text-primary-400">
                          Detail
                          <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Layar kecil: kartu baris interaktif */}
            <ul className={`lg:hidden ${tbodyCls}`}>
              {vehicles.map((v) => {
                const telemetry = getOdometerTelemetry(v);
                return (
                  <li
                    key={v.id}
                    onClick={() => setSelectedVehicleId(v.id)}
                    className="cursor-pointer space-y-2.5 px-4 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold capitalize text-slate-900 dark:text-white">
                          {v.brand} {v.model}{' '}
                          <span className="font-normal text-slate-500 dark:text-slate-400">{v.year}</span>
                        </p>
                        <p className="truncate text-[13px] text-slate-600 dark:text-slate-400">{v.owner.full_name}</p>
                      </div>
                      <Plate number={v.plate_number} size="sm" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="tabular-nums font-medium text-slate-700 dark:text-slate-300">
                          {telemetry.currentOdo.toLocaleString('id-ID')} km
                        </span>
                        {telemetry.isDue ? (
                          <span className="font-bold text-primary-600 dark:text-primary-400">
                            Waktunya servis (+30k km)
                          </span>
                        ) : (
                          <span className="text-slate-500">
                            Sisa {telemetry.remainingKm.toLocaleString('id-ID')} km
                          </span>
                        )}
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          style={{ width: `${telemetry.progressPct}%` }}
                          className={clsx(
                            'h-full rounded-full',
                            telemetry.isDue ? 'bg-primary-600' : 'bg-emerald-500'
                          )}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-slate-600 dark:text-slate-400">
                      <span className="tabular-nums">{v.total_bookings}x servis</span>
                      {v.last_booking ? (
                        <StatusBadge status={v.last_booking.status as BookingStatus} size="sm" />
                      ) : (
                        <span>Belum pernah servis</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </TableCard>
      )}

      {/* Slide-over Drawer Detail Kendaraan & Pengingat Live Support */}
      {selectedVehicle && (() => {
        const telemetry = getOdometerTelemetry(selectedVehicle);
        const history = selectedVehicle.service_history ?? [];

        return (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
              onClick={() => setSelectedVehicleId(null)}
              aria-hidden
              className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity"
            />

            {/* Drawer Panel */}
            <aside
              role="dialog"
              aria-modal="true"
              aria-label={`Detail kendaraan ${selectedVehicle.plate_number}`}
              className="sg-drawer-panel relative z-10 flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <Plate number={selectedVehicle.plate_number} size="md" />
                  <div>
                    <h2 className="text-lg font-extrabold capitalize text-slate-900 dark:text-white">
                      {selectedVehicle.brand} {selectedVehicle.model}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tahun {selectedVehicle.year} ·{' '}
                      {selectedVehicle.vehicle_type === 'mobil' ? 'Mobil' : 'Motor'} · ID{' '}
                      <span className="font-mono">{selectedVehicle.id.slice(0, 8)}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedVehicleId(null)}
                  aria-label="Tutup panel detail"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Drawer Scrollable Body */}
              <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                {/* 1. Odometer & Interval +30.000 km Card */}
                <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Analisis Odometer &amp; Servis Berkala
                      </h3>
                    </div>
                    {telemetry.isDue ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary-600 px-2.5 py-0.5 text-[11px] font-bold text-white">
                        <AlertTriangle className="h-3 w-3" />
                        Lewat +30.000 km
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" />
                        Dalam Batas Aman
                      </span>
                    )}
                  </div>

                  {/* 3 Kolom Angka Odometer */}
                  <div className="mt-4 grid grid-cols-3 gap-2.5">
                    <div className="rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Odo Servis Terakhir</p>
                      <p className="mt-1 text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                        {telemetry.lastServiceOdo.toLocaleString('id-ID')} km
                      </p>
                      {selectedVehicle.last_service_date && (
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {shortDate(selectedVehicle.last_service_date)}
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Odo Saat Ini</p>
                        <button
                          type="button"
                          onClick={() => setEditingOdo((v) => !v)}
                          title="Ubah odometer terkini"
                          className="text-slate-400 hover:text-primary-600 dark:hover:text-primary-400"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                      </div>
                      {editingOdo ? (
                        <form onSubmit={handleSaveOdo} className="mt-1 flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            value={odoInput}
                            onChange={(e) => setOdoInput(e.target.value)}
                            className="w-full rounded-md border border-primary-500 bg-slate-50 px-1.5 py-0.5 text-xs font-bold tabular-nums text-slate-900 focus:outline-none dark:bg-slate-900 dark:text-white"
                          />
                          <button
                            type="submit"
                            disabled={updateOdoMutation.isPending}
                            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary-600 text-white hover:bg-primary-700"
                          >
                            <Save className="h-3 w-3" />
                          </button>
                        </form>
                      ) : (
                        <p className="mt-1 text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                          {telemetry.currentOdo.toLocaleString('id-ID')} km
                        </p>
                      )}
                    </div>

                    <div
                      className={clsx(
                        'rounded-xl border p-3',
                        telemetry.isDue
                          ? 'border-primary-300 bg-primary-50/70 dark:border-primary-500/40 dark:bg-primary-950/30'
                          : 'border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950'
                      )}
                    >
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Selisih Tempuh</p>
                      <p
                        className={clsx(
                          'mt-1 text-sm font-extrabold tabular-nums',
                          telemetry.isDue
                            ? 'text-primary-600 dark:text-primary-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        )}
                      >
                        +{telemetry.deltaKm.toLocaleString('id-ID')} km
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar Target 30.000 km */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400">Siklus Servis (+30.000 km)</span>
                      <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-200">
                        Target: {telemetry.nextTargetOdo.toLocaleString('id-ID')} km ({telemetry.progressPct}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        style={{ width: `${telemetry.progressPct}%` }}
                        className={clsx(
                          'h-full rounded-full transition-all duration-500',
                          telemetry.isDue
                            ? 'bg-primary-600'
                            : telemetry.isApproaching
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        )}
                      />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {telemetry.isDue
                        ? `Jarak tempuh sudah bertambah ${telemetry.deltaKm.toLocaleString('id-ID')} km sejak servis terakhir. Disarankan langsung hubungi pemilik untuk servis berkala.`
                        : `Masih tersisa ${telemetry.remainingKm.toLocaleString('id-ID')} km lagi sebelum mencapai batas rekomendasi servis +30.000 km.`}
                    </p>
                  </div>
                </section>

                {/* 2. Informasi Lengkap Kendaraan & Pemilik */}
                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Card Pemilik */}
                  <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <User className="h-3.5 w-3.5" />
                      Pemilik Kendaraan
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-900 dark:text-white">
                        {selectedVehicle.owner.full_name}
                      </p>
                      <p className="text-xs font-mono text-slate-400">
                        Profile ID: {selectedVehicle.owner.id.slice(0, 12)}...
                      </p>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="tabular-nums">{selectedVehicle.owner.phone || 'Belum ada nomor HP'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{selectedVehicle.owner.email || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Spesifikasi & Aktivitas */}
                  <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Detail Kendaraan
                    </div>
                    <dl className="grid grid-cols-2 gap-y-2 text-xs">
                      <dt className="text-slate-500 dark:text-slate-400">Merek / Model</dt>
                      <dd className="text-right font-semibold capitalize text-slate-900 dark:text-white">
                        {selectedVehicle.brand} {selectedVehicle.model}
                      </dd>

                      <dt className="text-slate-500 dark:text-slate-400">Tahun / Tipe</dt>
                      <dd className="text-right font-semibold text-slate-900 dark:text-white">
                        {selectedVehicle.year} · {selectedVehicle.vehicle_type === 'mobil' ? 'Mobil' : 'Motor'}
                      </dd>

                      <dt className="text-slate-500 dark:text-slate-400">Servis Selesai</dt>
                      <dd className="text-right font-semibold tabular-nums text-slate-900 dark:text-white">
                        {selectedVehicle.completed_bookings} dari {selectedVehicle.total_bookings} booking
                      </dd>

                      <dt className="text-slate-500 dark:text-slate-400">Terdaftar Sejak</dt>
                      <dd className="text-right font-semibold text-slate-900 dark:text-white">
                        {shortDate(selectedVehicle.created_at)}
                      </dd>
                    </dl>
                  </div>
                </section>

                {/* 3. Riwayat Servis & Booking Kendaraan */}
                <section className="space-y-2.5 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <History className="h-3.5 w-3.5" />
                      Riwayat Servis &amp; Odometer
                    </div>
                    <span className="text-xs text-slate-400">{history.length} catatan</span>
                  </div>

                  {history.length > 0 ? (
                    <ul className="max-h-48 space-y-2 overflow-y-auto pr-1">
                      {history.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-900"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400">
                              <Wrench className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                                {item.service_names.length > 0
                                  ? item.service_names.join(', ')
                                  : 'Servis Berkala / Umum'}
                              </p>
                              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {shortDate(item.scheduled_at)}
                                </span>
                                {item.odometer_km !== null && (
                                  <span>· Odo {item.odometer_km.toLocaleString('id-ID')} km</span>
                                )}
                              </p>
                            </div>
                          </div>
                          <StatusBadge status={item.status as BookingStatus} size="sm" />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-xl border border-dashed border-slate-200 py-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      Belum ada transaksi servis tercatat untuk kendaraan ini.
                    </p>
                  )}
                </section>

                {/* 4. Live Support Reminder & Voucher Composer */}
                <section
                  className={clsx(
                    'space-y-3.5 rounded-2xl border p-4 transition-colors',
                    telemetry.isDue
                      ? 'border-primary-300 bg-primary-50/40 dark:border-primary-500/40 dark:bg-primary-950/20'
                      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Kirim Pengingat Servis &amp; Voucher
                      </h3>
                    </div>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Via Live Support
                    </span>
                  </div>

                  {/* Pilihan Voucher Aktif dari Database */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <Ticket className="h-3.5 w-3.5 text-primary-600" />
                      Pilih Voucher Aktif ({activePromos.length})
                    </label>
                    {activePromos.length > 0 ? (
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {activePromos.map((promo) => {
                          const active = selectedVoucherCode === promo.code;
                          return (
                            <button
                              key={promo.id}
                              type="button"
                              onClick={() => setSelectedVoucherCode(promo.code)}
                              className={clsx(
                                'rounded-xl border px-3 py-2 text-left transition-all',
                                active
                                  ? 'border-primary-600 bg-primary-600 text-white shadow-xs'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'
                              )}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-mono text-xs font-bold">{promo.code}</span>
                                <span
                                  className={clsx(
                                    'text-[10px] font-semibold',
                                    active ? 'text-white/90' : 'text-primary-600 dark:text-primary-400'
                                  )}
                                >
                                  {promoSummary(promo)}
                                </span>
                              </div>
                              <p
                                className={clsx(
                                  'mt-0.5 truncate text-[11px]',
                                  active ? 'text-white/85' : 'text-slate-500 dark:text-slate-400'
                                )}
                              >
                                {promo.title}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="rounded-xl border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                        Belum ada voucher aktif. Pesan tetap bisa dikirim atau buat voucher dulu di menu Voucher.
                      </p>
                    )}
                  </div>

                  {/* Preview / Edit Template Pesan */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="reminder-message"
                        className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                      >
                        Draft Pesan ke {selectedVehicle.owner.full_name}
                      </label>
                      <button
                        type="button"
                        onClick={handleCopyMessage}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      >
                        {copied ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            Tersalin
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Salin teks
                          </>
                        )}
                      </button>
                    </div>
                    <textarea
                      id="reminder-message"
                      rows={6}
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-800 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                    />
                  </div>
                </section>
              </div>

              {/* Drawer Sticky Footer CTA */}
              <div className="flex flex-col gap-2.5 border-t border-slate-200 bg-slate-50/90 px-6 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900/90">
                <button
                  type="button"
                  onClick={() => setSelectedVehicleId(null)}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => handleSendToLiveSupport(selectedVehicle)}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary-700 active:scale-[0.99] sm:flex-initial"
                >
                  <MessageSquareShare className="h-4 w-4" />
                  Kirim ke Live Support
                </button>
              </div>
            </aside>
          </div>
        );
      })()}
    </div>
  );
}