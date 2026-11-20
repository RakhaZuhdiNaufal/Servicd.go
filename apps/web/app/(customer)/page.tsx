'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CalendarPlus, Car, ChevronDown, ChevronRight, ClipboardList, Clock, LayoutGrid, MapPin, Phone, Receipt, RotateCcw, Tag, Wrench } from 'lucide-react';
import { clsx } from 'clsx';
import { promoSummary, type PromoDTO } from '@servicego/shared';
import { fetcher } from '@/lib/fetcher';
import { useAuth } from '@/lib/auth-context';
import { toWIBParts } from '@/lib/wib';
import { bookingCode, formatDate, formatDuration, formatRp } from '@/lib/format';
import { Plate } from '@/components/customer/plate';
import { EmptyState, ErrorState, SkeletonBlock } from '@/components/customer/states';
import { StatusBadge } from '@/components/status-badge';
import { GuestLanding } from '@/components/customer/landing';
import { btnAccent, btnPrimary, btnSecondary, card, h2, lead, linkText, pageStack } from '@/components/customer/ui';
import { WorkshopFront } from '@/components/illustrations/workshop';
import {
  CATEGORY_ICONS,
  SERVICE_CATEGORIES,
  getServiceCategory,
  type ServiceCategoryId
} from '@/components/customer/booking/service-selector';

// ---------------------------------------------------------------------------
// Bentuk data (mengikuti route di app/api/v1)
// ---------------------------------------------------------------------------

interface Vehicle {
  id: string;
  plate_number: string;
  brand: string;
  model: string;
  year?: number | null;
  vehicle_type: string;
  last_odometer_km?: number | null;
  last_service_date?: string | null;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number | string;
  duration_minutes: number;
  is_active: boolean;
}

/** Voucher dari GET /api/v1/promos (tabel `promos`, aturan potongan di packages/shared). */
type Promo = PromoDTO;

type BookingStatus = 'menunggu' | 'dikonfirmasi' | 'diproses' | 'selesai' | 'dibatalkan';

/** GET /bookings: include vehicle, booking_services.service, mechanic, branch (id, name, address, phone). */
interface Booking {
  id: string;
  status: BookingStatus;
  scheduled_at: string;
  estimated_cost: number | string;
  vehicle_id?: string;
  vehicle: { id?: string; plate_number: string; brand: string; model: string } | null;
  booking_services: Array<{ service: { id?: string; name: string } }>;
  branch?: { id?: string; name: string; address?: string; phone?: string } | null;
}

const longDate = (iso: string) =>
  formatDate(iso, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Jakarta' });
/** Tanggal ringkas untuk ruang sempit, misal "31 Des 2026". */
const shortDate = (iso: string) =>
  formatDate(iso, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
const fullDate = (iso: string) =>
  formatDate(iso, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
const wibTime = (iso: string) => `${toWIBParts(new Date(iso)).time.replace(':', '.')} WIB`;

/** Link form booking yang sudah terisi kendaraan, bengkel, dan layanan pertama dari booking lama. */
function rebookHref(b: Booking) {
  const params = new URLSearchParams();
  const vehicleId = b.vehicle?.id ?? b.vehicle_id;
  if (vehicleId) params.set('vehicle_id', vehicleId);
  if (b.branch?.id) params.set('branch_id', b.branch.id);
  const firstService = b.booking_services.find((bs) => bs.service.id)?.service.id;
  if (firstService) params.set('service_id', firstService);
  const q = params.toString();
  return `/booking/new${q ? `?${q}` : ''}`;
}

export default function BerandaPage() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="space-y-8" role="status" aria-label="Memuat beranda">
        <SkeletonBlock className="h-10 w-2/3 max-w-md" />
        <SkeletonBlock className="h-48 w-full" />
        <SkeletonBlock className="h-32 w-full" />
      </div>
    );
  }

  return session ? <MemberHome /> : <GuestHome />;
}

// ---------------------------------------------------------------------------
// TAMU: landing
// ---------------------------------------------------------------------------

function GuestHome() {
  return <GuestLanding />;
}

// ---------------------------------------------------------------------------
// SUDAH LOGIN: dashboard pribadi
// ---------------------------------------------------------------------------

function MemberHome() {
  const { user } = useAuth();

  const bookingsQuery = useQuery<Booking[]>({
    queryKey: ['bookings'],
    queryFn: () => fetcher('/bookings'),
    enabled: !!user
  });

  const active = (bookingsQuery.data ?? [])
    .filter((b) => b.status === 'menunggu' || b.status === 'dikonfirmasi' || b.status === 'diproses')
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  return (
    <div className={pageStack}>
      <section aria-label="Booking aktif" className="space-y-6 pt-2 sm:pt-4">
        <div className="flex sm:justify-end">
          <Link href="/booking/new" className={clsx(btnAccent, 'w-full shrink-0 sm:w-auto')}>
            <CalendarPlus className="h-5 w-5" aria-hidden />
            Booking servis baru
          </Link>
        </div>

        <ActiveBookingPanel query={bookingsQuery} active={active} />
      </section>

      <VehiclesSection bookings={bookingsQuery.data} />
      <ServicesSection />
      <PromosSection />
    </div>
  );
}

// ---------------------------------------------------------------------------

const PROGRESS = ['Diterima', 'Dikonfirmasi', 'Dikerjakan', 'Siap diambil'];

/** Bagian fokus dashboard: panel lebar untuk booking aktif terdekat, dengan ilustrasi bengkel. */
function ActiveBookingPanel({
  query,
  active
}: {
  query: { isLoading: boolean; isError: boolean; isSuccess: boolean; error: unknown; refetch: () => unknown };
  active: Booking[];
}) {
  const next = active[0];
  const others = active.length - 1;

  if (query.isLoading) return <SkeletonBlock className="h-80 w-full rounded-[20px]" />;

  if (query.isError) {
    return (
      <ErrorState
        title="Booking kamu belum bisa dimuat"
        message={(query.error as Error)?.message}
        onRetry={() => query.refetch()}
      />
    );
  }

  if (query.isSuccess && !next) {
    return (
      <div className="flex flex-col gap-4 rounded-[20px] border border-dashed border-slate-300 px-6 py-8 sm:flex-row sm:items-center sm:px-8 dark:border-slate-700">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-ctl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <ClipboardList className="h-6 w-6" aria-hidden />
        </span>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Belum ada booking yang berjalan</h2>
          <p className="text-[15px] text-slate-600 dark:text-slate-400">
            Booking yang menunggu konfirmasi atau sedang dikerjakan akan tampil di sini, lengkap dengan statusnya.
          </p>
        </div>
      </div>
    );
  }

  if (!next) return null;

  const step = next.status === 'diproses' ? 3 : next.status === 'dikonfirmasi' ? 2 : 1;
  const services = next.booking_services.map((bs) => bs.service.name).join(', ');

  return (
    <div className="space-y-2">
      <article
        aria-labelledby="aktif-title"
        className={clsx(card, 'overflow-hidden lg:grid lg:grid-cols-[1.35fr_1fr]')}
      >
        <div className="space-y-6 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <StatusBadge status={next.status} />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Kode booking{' '}
              <span className="font-mono font-medium text-slate-900 dark:text-white">{bookingCode(next.id)}</span>
            </p>
          </div>

          <div className="space-y-1">
            <h2
              id="aktif-title"
              className="text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400"
            >
              Booking aktif
            </h2>
            <p className="text-[24px] sm:text-[30px] font-bold leading-[1.15] tracking-[-0.015em] text-slate-900 dark:text-white">
              {longDate(next.scheduled_at)}
            </p>
            <p className="text-[16px] text-slate-600 dark:text-slate-400">Datang pukul {wibTime(next.scheduled_at)}</p>
          </div>

          <div>
            <div className="grid grid-cols-4 gap-1.5" aria-hidden>
              {PROGRESS.map((p, i) => (
                <span
                  key={p}
                  className={clsx('h-1.5 rounded', i < step ? 'bg-accent-500' : 'bg-slate-200 dark:bg-slate-700')}
                />
              ))}
            </div>
            <ol
              className="mt-2 grid grid-cols-4 gap-1.5 text-[11px] leading-tight text-slate-600 sm:text-[13px] dark:text-slate-400"
              aria-label="Tahap servis"
            >
              {PROGRESS.map((p, i) => (
                <li
                  key={p}
                  className={clsx(
                    i > 0 && i < PROGRESS.length - 1 && 'text-center',
                    i === PROGRESS.length - 1 && 'text-right',
                    i === step - 1 && 'font-semibold text-slate-900 dark:text-white'
                  )}
                  aria-current={i === step - 1 ? 'step' : undefined}
                >
                  {p}
                </li>
              ))}
            </ol>
          </div>

          <dl className="grid gap-5 border-t border-slate-200 pt-6 sm:grid-cols-2 dark:border-slate-800">
            <div className="space-y-1.5">
              <dt className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Car className="h-4 w-4" aria-hidden />
                Kendaraan
              </dt>
              <dd>
                {next.vehicle ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <Plate number={next.vehicle.plate_number} />
                    <span className="text-[15px] font-semibold text-slate-900 dark:text-white">
                      {next.vehicle.brand} {next.vehicle.model}
                    </span>
                  </span>
                ) : (
                  <span className="text-sm text-slate-600 dark:text-slate-400">Data kendaraan tidak tersedia</span>
                )}
              </dd>
            </div>
            <div className="space-y-1.5">
              <dt className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <MapPin className="h-4 w-4" aria-hidden />
                Bengkel
              </dt>
              <dd className="space-y-0.5">
                <p className="text-[15px] font-semibold text-slate-900 dark:text-white">
                  {next.branch?.name ?? 'Bengkel belum tercatat'}
                </p>
                {next.branch?.address && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">{next.branch.address}</p>
                )}
              </dd>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <dt className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Wrench className="h-4 w-4" aria-hidden />
                Layanan
              </dt>
              <dd className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="text-[15px] text-slate-900 dark:text-white">{services || 'Layanan belum tercatat'}</span>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Estimasi{' '}
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    {formatRp(next.estimated_cost)}
                  </span>
                </span>
              </dd>
            </div>
          </dl>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link href={`/bookings/${next.id}`} className={btnPrimary}>
              Lihat detail booking
            </Link>
            {next.branch?.phone && (
              <a href={`tel:${next.branch.phone.replace(/[^0-9+]/g, '')}`} className={btnSecondary}>
                <Phone className="h-4 w-4" aria-hidden />
                Telepon bengkel
              </a>
            )}
          </div>
        </div>

        <div className="hidden items-end border-l border-slate-200 bg-slate-100 lg:flex dark:border-slate-800 dark:bg-slate-800">
          <WorkshopFront decorative />
        </div>
      </article>

      {others > 0 && (
        <Link href="/bookings" className={linkText}>
          Lihat {others} booking aktif lainnya di Riwayat
        </Link>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

/** Kendaraan + akses cepat booking ulang dari servis selesai terakhir untuk tiap kendaraan. */
function VehiclesSection({ bookings }: { bookings?: Booking[] }) {
  const { user } = useAuth();
  const vehiclesQuery = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => fetcher('/vehicles'),
    enabled: !!user
  });
  const vehicles = vehiclesQuery.data ?? [];

  // Booking selesai terbaru per kendaraan (data dari GET /bookings, cache yang sama dengan panel di atas).
  const lastDone = useMemo(() => {
    const map = new Map<string, Booking>();
    const done = (bookings ?? [])
      .filter((b) => b.status === 'selesai')
      .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
    for (const b of done) {
      const vid = b.vehicle?.id ?? b.vehicle_id;
      if (vid && !map.has(vid)) map.set(vid, b);
    }
    return map;
  }, [bookings]);

  return (
    <section aria-labelledby="kendaraan-title" className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="kendaraan-title" className={h2}>
            Kendaraan kamu
          </h2>
          {vehicles.length > 0 && (
            <Link href="/profile" className="text-[15px] font-semibold text-slate-900 underline-offset-4 hover:underline dark:text-white">
              Kelola di Profil
            </Link>
          )}
        </div>
        <p className={lead}>Booking ulang servis terakhir, atau mulai booking baru untuk kendaraan tertentu.</p>
      </div>

      {vehiclesQuery.isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonBlock className="h-56 rounded-[20px]" />
          <SkeletonBlock className="h-56 rounded-[20px]" />
        </div>
      )}

      {vehiclesQuery.isError && (
        <ErrorState
          title="Daftar kendaraan belum bisa dimuat"
          message={(vehiclesQuery.error as Error)?.message}
          onRetry={() => vehiclesQuery.refetch()}
        />
      )}

      {vehiclesQuery.isSuccess && vehicles.length === 0 && (
        <EmptyState
          icon={Car}
          title="Belum ada kendaraan terdaftar"
          description="Tambahkan mobil atau motor kamu di Profil supaya bisa dipilih saat booking."
          action={{ label: 'Tambah kendaraan di Profil', href: '/profile' }}
        />
      )}

      {vehicles.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2">
          {vehicles.map((v) => {
            const last = lastDone.get(v.id);
            const firstService = last?.booking_services[0]?.service.name;
            return (
              // min-w-0: tanpa ini sel grid tidak boleh menyusut di bawah lebar isinya,
              // dan nama layanan yang panjang melebarkan kartu melewati layar.
              <li key={v.id} className={clsx(card, 'flex min-w-0 flex-col p-5 sm:p-6')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2.5">
                    <Plate number={v.plate_number} size="lg" />
                    {/* capitalize: merek & model datang apa adanya dari input pengguna ("toyota Xenia"). */}
                    <p className="text-[17px] font-semibold capitalize text-slate-900 dark:text-white">
                      {v.brand} {v.model}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-chip bg-slate-100 px-2.5 py-1 text-[13px] font-semibold capitalize text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {v.vehicle_type}
                  </span>
                </div>

                <dl className="mt-5 divide-y divide-slate-200 border-y border-slate-200 text-[14px] dark:divide-slate-800 dark:border-slate-800">
                  {v.year != null && (
                    <div className="flex items-baseline justify-between gap-4 py-2.5">
                      <dt className="text-slate-500 dark:text-slate-400">Tahun</dt>
                      <dd className="text-slate-900 dark:text-white">{v.year}</dd>
                    </div>
                  )}
                  {v.last_odometer_km != null && (
                    <div className="flex items-baseline justify-between gap-4 py-2.5">
                      <dt className="text-slate-500 dark:text-slate-400">Odometer</dt>
                      <dd className="text-slate-900 dark:text-white">
                        {v.last_odometer_km.toLocaleString('id-ID')} km
                      </dd>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="shrink-0 text-slate-500 dark:text-slate-400">Servis terakhir</dt>
                    <dd className="min-w-0 text-right text-slate-900 dark:text-white">
                      {last ? (
                        <>
                          <span className="block">{fullDate(last.scheduled_at)}</span>
                          <span className="block truncate text-[13px] text-slate-500 dark:text-slate-400">
                            {last.booking_services.map((bs) => bs.service.name).join(', ') || 'Layanan belum tercatat'}
                          </span>
                        </>
                      ) : v.last_service_date ? (
                        fullDate(v.last_service_date)
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400">Belum ada</span>
                      )}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  {last ? (
                    // Sudah pernah servis: yang utama melihat bukti servis terakhir, bukan booking lagi.
                    <>
                      <Link href={`/bookings/${last.id}/struk`} className={btnSecondary}>
                        <Receipt className="h-4 w-4" aria-hidden />
                        Lihat struk servis
                      </Link>
                      <Link
                        href={rebookHref(last)}
                        className={clsx(linkText, 'justify-center sm:px-2')}
                        title={`Ulangi servis ${firstService ?? ''}`.trim()}
                      >
                        <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden />
                        Booking ulang
                      </Link>
                    </>
                  ) : (
                    <Link href={`/booking/new?vehicle_id=${v.id}`} className={btnSecondary}>
                      <CalendarPlus className="h-4 w-4" aria-hidden />
                      Booking servis
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Data publik: layanan dan promo
// ---------------------------------------------------------------------------

function ServicesSection() {
  const servicesQuery = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: () => fetcher('/services')
  });
  const services = useMemo(() => (servicesQuery.data ?? []).filter((s) => s.is_active), [servicesQuery.data]);

  const grouped = useMemo(() => {
    const map = new Map<ServiceCategoryId, Service[]>();
    for (const s of services) {
      const c = getServiceCategory(s.name, s.description);
      map.set(c, [...(map.get(c) ?? []), s]);
    }
    return map;
  }, [services]);
  const cats = SERVICE_CATEGORIES.filter((c) => grouped.has(c.id));
  const [picked, setPicked] = useState<ServiceCategoryId | 'all'>('all');
  const [catsOpen, setCatsOpen] = useState(false); // tertutup dulu, dibuka sendiri oleh pengguna
  const active = picked !== 'all' && grouped.has(picked) ? picked : 'all';
  const list = active === 'all' ? services : grouped.get(active) ?? [];

  /** Satu baris menu kategori; bentuknya sama dengan panel kategori di landing. */
  const itemCls = (on: boolean) =>
    clsx(
      'flex w-full min-h-[44px] items-center gap-3 rounded-ctl px-4 text-[15px] font-semibold transition-colors',
      on
        ? 'bg-slate-900 text-white dark:bg-slate-700'
        : 'text-slate-900 hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800'
    );

  return (
    <section aria-labelledby="layanan-title" className="space-y-6">
      <div className="mx-auto max-w-2xl space-y-2 text-center">
        <h2 id="layanan-title" className={h2}>
          Layanan dan harga
        </h2>
        <p className={lead}>Pilih layanan, lalu lanjut booking dengan estimasi biaya yang sudah terhitung.</p>
      </div>

      {servicesQuery.isLoading && (
        <div className="grid gap-3 md:grid-cols-2" aria-busy>
          {[0, 1, 2, 3].map((i) => (
            <SkeletonBlock key={i} className="h-28" />
          ))}
        </div>
      )}

      {servicesQuery.isError && (
        <ErrorState
          title="Daftar layanan belum bisa dimuat"
          message={(servicesQuery.error as Error)?.message}
          onRetry={() => servicesQuery.refetch()}
        />
      )}

      {servicesQuery.isSuccess && services.length === 0 && (
        <EmptyState
          icon={Wrench}
          title="Belum ada layanan aktif"
          description="Daftar layanan akan tampil setelah bengkel menambahkannya."
        />
      )}

      {cats.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[240px_1fr] lg:items-start">
          {/* Kiri: panel kategori dengan dropdown, sama seperti di landing. */}
          <nav aria-label="Kategori layanan" className={clsx(card, 'space-y-1.5 p-3')}>
            <p className="pb-2 pt-1 text-center text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Kategori
            </p>
            <div className="mx-2 mb-1 border-b border-slate-200 dark:border-slate-800" aria-hidden />

            <button
              type="button"
              aria-pressed={active === 'all'}
              onClick={() => setPicked('all')}
              className={itemCls(active === 'all')}
            >
              <LayoutGrid
                className={clsx('h-[18px] w-[18px] shrink-0', active === 'all' ? 'text-white' : 'text-slate-500 dark:text-slate-400')}
                aria-hidden
              />
              <span className="flex-1 text-left">Semua</span>
            </button>

            <button
              type="button"
              aria-expanded={catsOpen}
              onClick={() => setCatsOpen((v) => !v)}
              className="flex w-full min-h-[44px] items-center gap-3 rounded-ctl px-4 text-[15px] font-semibold text-slate-900 transition-colors hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800"
            >
              <span className="flex-1 text-left">Per kategori</span>
              <ChevronDown className={clsx('h-4 w-4 shrink-0 transition-transform', catsOpen && 'rotate-180')} aria-hidden />
            </button>

            {catsOpen &&
              cats.map((c) => {
                const on = c.id === active;
                const Icon = CATEGORY_ICONS[c.id];
                return (
                  <button key={c.id} type="button" aria-pressed={on} onClick={() => setPicked(c.id)} className={itemCls(on)}>
                    <Icon
                      className={clsx('h-[18px] w-[18px] shrink-0', on ? 'text-white' : 'text-slate-500 dark:text-slate-400')}
                      aria-hidden
                    />
                    <span className="flex-1 text-left">{c.label}</span>
                  </button>
                );
              })}
          </nav>

          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((s) => {
              const Icon = CATEGORY_ICONS[getServiceCategory(s.name, s.description)];
              return (
                <li key={s.id} className={clsx(card, 'group flex h-full flex-col overflow-hidden')}>
                  {/* "Foto" layanan: blok gelap + ikon kategori, sama seperti kartu di landing. */}
                  <span
                    aria-hidden
                    className="flex h-44 w-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-accent-500"
                  >
                    <Icon className="h-14 w-14 transition-transform duration-300 group-hover:scale-110" strokeWidth={1} />
                  </span>
                  <div className="flex flex-1 flex-col p-5">
                    <Link
                      href={`/services/${s.id}`}
                      className="leading-snug text-slate-900 underline-offset-4 hover:underline dark:text-white"
                    >
                      {s.name}
                    </Link>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-slate-600 dark:text-slate-400">
                      <Clock className="h-3.5 w-3.5" aria-hidden />
                      {formatDuration(s.duration_minutes)}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="text-[15px] text-slate-600 dark:text-slate-400">{formatRp(s.price)}</span>
                      <Link
                        href={`/booking/new?service_id=${s.id}`}
                        aria-label={`Booking ${s.name}`}
                        className={clsx(btnSecondary, 'shrink-0')}
                      >
                        Booking
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function PromosSection() {
  const promosQuery = useQuery<Promo[]>({
    queryKey: ['promos'],
    queryFn: () => fetcher('/promos')
  });
  const promos = (promosQuery.data ?? []).filter((p) => p.is_active);

  return (
    <section aria-labelledby="promo-title" className="space-y-6">
      <h2 id="promo-title" className={clsx(h2, 'text-center')}>
        Kode voucher
      </h2>

      {promosQuery.isLoading && (
        <div className="grid gap-4 md:grid-cols-3" aria-busy>
          {[0, 1, 2].map((i) => (
            <SkeletonBlock key={i} className="h-64" />
          ))}
        </div>
      )}

      {promosQuery.isError && (
        <ErrorState
          title="Paket promo belum bisa dimuat"
          message={(promosQuery.error as Error)?.message}
          onRetry={() => promosQuery.refetch()}
        />
      )}

      {promosQuery.isSuccess && promos.length === 0 && (
        <EmptyState icon={Tag} title="Belum ada paket promo" description="Promo dari bengkel akan tampil di sini." />
      )}

      {promos.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {promos.map((p) => (
            <li key={p.id}>
              {/* Bentuk tiket: kepala gelap, lalu garis sobek dengan dua lubang yang menggigit
                  tepi kiri & kanan kartu. Lubang diwarnai latar halaman dan dipotong
                  overflow-hidden, jadi siluet kartunya benar-benar terlihat berlubang. */}
              <Link
                href={`/booking/new?promo=${encodeURIComponent(p.code)}`}
                aria-label={`Booking pakai kode promo ${p.code}`}
                className="group relative flex h-full items-stretch overflow-hidden rounded-[14px] border border-slate-200 bg-white transition-colors hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-500"
              >
                <div className="flex w-[84px] shrink-0 items-center justify-center bg-slate-900 dark:bg-slate-950">
                  <span className="text-[22px] font-bold leading-none tracking-[-0.02em] text-accent-500">
                    {p.discount_type === 'nominal' ? formatRp(p.discount_value) : `${p.discount_percent}%`}
                  </span>
                </div>

                {/* Sobekan: dua gigitan bulat sewarna latar halaman di tepi atas & bawah. */}
                <span aria-hidden className="relative z-10 w-0">
                  <span className="absolute inset-y-2 -left-px border-l border-dashed border-slate-300 dark:border-slate-600" />
                  <span className="absolute -top-2 -left-2 h-4 w-4 rounded-full bg-[var(--bg-base)]" />
                  <span className="absolute -bottom-2 -left-2 h-4 w-4 rounded-full bg-[var(--bg-base)]" />
                </span>

                <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="truncate text-[14px] font-semibold leading-snug text-slate-900 dark:text-white">
                      {p.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Kode dibedakan sebagai chip, bukan teks tebal, supaya tidak bersaing dengan judul. */}
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <span className="sr-only">Kode promo </span>
                        {p.code}
                      </span>
                      <span className="text-[12px] text-slate-500 dark:text-slate-400">
                        {p.valid_until ? `s/d ${shortDate(p.valid_until)}` : 'Tanpa batas waktu'}
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
