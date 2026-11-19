'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CalendarPlus, Car, ClipboardList, Clock, MapPin, Phone, RotateCcw, Tag, Wrench } from 'lucide-react';
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
import { WorkshopFront } from '@/components/illustrations/workshop';
import {
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

interface ProfileResponse {
  profile: { full_name: string };
}

const ctaAccent =
  'inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-ctl bg-accent-500 px-6 text-[17px] font-bold text-slate-950 hover:bg-accent-600 transition-colors';
const btnPrimary =
  'inline-flex min-h-[52px] items-center justify-center gap-2 rounded-ctl bg-primary-600 px-6 text-[16px] font-bold text-white hover:bg-primary-700 transition-colors';
const btnSecondary =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-ctl border border-slate-300 bg-white px-4 text-[15px] font-semibold text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800 transition-colors';
const card = 'rounded-[20px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';
const h2 = 'text-[24px] sm:text-[30px] font-extrabold leading-[1.15] tracking-[-0.015em] text-slate-900 dark:text-white';
const lead = 'text-[16px] leading-relaxed text-slate-600 dark:text-slate-400';
const linkText =
  'inline-flex min-h-[44px] items-center text-[15px] font-semibold text-primary-700 hover:underline dark:text-primary-100';

const longDate = (iso: string) =>
  formatDate(iso, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Jakarta' });
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

  const profileQuery = useQuery<ProfileResponse>({
    queryKey: ['profile'],
    queryFn: () => fetcher('/profile')
  });

  const bookingsQuery = useQuery<Booking[]>({
    queryKey: ['bookings'],
    queryFn: () => fetcher('/bookings'),
    enabled: !!user
  });

  const fullName: string =
    profileQuery.data?.profile?.full_name ||
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split('@')[0] ||
    '';
  const firstName = fullName.trim().split(/\s+/)[0];

  const active = (bookingsQuery.data ?? [])
    .filter((b) => b.status === 'menunggu' || b.status === 'dikonfirmasi' || b.status === 'diproses')
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  let subline = 'Ringkasan booking dan kendaraan kamu.';
  if (bookingsQuery.isSuccess) {
    subline =
      active.length === 0
        ? 'Belum ada booking yang berjalan. Kendaraan dan servis terakhir kamu ada di bawah.'
        : active[0].status === 'diproses'
          ? `Kendaraan kamu sedang dikerjakan di ${active[0].branch?.name ?? 'bengkel ServiceGo'}.`
          : `Booking berikutnya ${longDate(active[0].scheduled_at)}, pukul ${wibTime(active[0].scheduled_at)}.`;
  }

  return (
    <div className="space-y-14 sm:space-y-16">
      <section aria-labelledby="sapa-title" className="space-y-6 pt-2 sm:pt-4">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-2">
            <h1
              id="sapa-title"
              className="text-[30px] sm:text-[40px] font-extrabold leading-[1.1] tracking-[-0.015em] text-slate-900 dark:text-white"
            >
              {firstName ? `Halo, ${firstName}` : 'Halo'}
            </h1>
            <p className="text-[17px] leading-relaxed text-slate-600 dark:text-slate-400">{subline}</p>
          </div>
          <Link href="/booking/new" className={clsx(ctaAccent, 'shrink-0')}>
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

  if (query.isLoading) return <SkeletonBlock className="h-80 w-full rounded-[28px]" />;

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
      <div className="flex flex-col gap-4 rounded-[28px] border border-dashed border-slate-300 px-6 py-8 sm:flex-row sm:items-center sm:px-8 dark:border-slate-700">
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
        className={clsx(
          'overflow-hidden rounded-[28px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
          'lg:grid lg:grid-cols-[1.35fr_1fr]'
        )}
      >
        <div className="space-y-7 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <StatusBadge status={next.status} />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Kode booking{' '}
              <span className="font-mono font-medium text-slate-900 dark:text-white">{bookingCode(next.id)}</span>
            </p>
          </div>

          <div className="space-y-1">
            <h2 id="aktif-title" className="text-[15px] font-bold text-primary-700 dark:text-primary-100">
              Booking aktif
            </h2>
            <p className="text-[26px] sm:text-[34px] font-extrabold leading-[1.1] tracking-[-0.015em] text-slate-900 dark:text-white">
              {longDate(next.scheduled_at)}
            </p>
            <p className="text-[17px] text-slate-700 dark:text-slate-300">Datang pukul {wibTime(next.scheduled_at)}</p>
          </div>

          <div>
            <div className="grid grid-cols-4 gap-1.5" aria-hidden>
              {PROGRESS.map((p, i) => (
                <span
                  key={p}
                  className={clsx('h-1.5 rounded', i < step ? 'bg-primary-600' : 'bg-slate-200 dark:bg-slate-700')}
                />
              ))}
            </div>
            <ol className="mt-2 grid grid-cols-4 text-[13px] text-slate-600 dark:text-slate-400" aria-label="Tahap servis">
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
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white">
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
              <a
                href={`tel:${next.branch.phone.replace(/[^0-9+]/g, '')}`}
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-ctl border border-slate-300 px-5 text-[15px] font-semibold text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800 transition-colors"
              >
                <Phone className="h-4 w-4" aria-hidden />
                Telepon bengkel
              </a>
            )}
          </div>
        </div>

        <div className="hidden items-end bg-primary-50 lg:flex dark:bg-slate-800">
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <h2 id="kendaraan-title" className={h2}>
            Kendaraan kamu
          </h2>
          <p className={lead}>Booking ulang servis terakhir, atau mulai booking baru untuk kendaraan tertentu.</p>
        </div>
        {vehicles.length > 0 && (
          <Link href="/profile" className={linkText}>
            Kelola di Profil
          </Link>
        )}
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
              <li key={v.id} className={clsx(card, 'flex flex-col gap-5 p-6')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2.5">
                    <Plate number={v.plate_number} size="lg" />
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {v.brand} {v.model}
                      {v.year ? <span className="font-medium text-slate-600 dark:text-slate-400"> ({v.year})</span> : null}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-chip bg-slate-100 px-2.5 py-1 text-[13px] font-semibold capitalize text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {v.vehicle_type}
                  </span>
                </div>

                <div className="rounded-ctl bg-slate-50 px-4 py-3.5 dark:bg-slate-800/60">
                  {last ? (
                    <>
                      <p className="text-[13px] text-slate-600 dark:text-slate-400">
                        Servis terakhir, {fullDate(last.scheduled_at)}
                        {last.branch?.name ? ` di ${last.branch.name}` : ''}
                      </p>
                      <p className="mt-0.5 text-[15px] font-semibold text-slate-900 dark:text-white">
                        {last.booking_services.map((bs) => bs.service.name).join(', ') || 'Layanan belum tercatat'}
                      </p>
                    </>
                  ) : (
                    <p className="text-[15px] text-slate-600 dark:text-slate-400">
                      {v.last_service_date
                        ? `Servis terakhir ${fullDate(v.last_service_date)}`
                        : 'Belum ada servis selesai di ServiceGo'}
                    </p>
                  )}
                </div>

                <div className="mt-auto flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  {last ? (
                    <>
                      <Link href={rebookHref(last)} className={btnSecondary} aria-describedby={`ulang-${v.id}`}>
                        <RotateCcw className="h-4 w-4" aria-hidden />
                        Booking ulang
                      </Link>
                      <Link href={`/booking/new?vehicle_id=${v.id}`} className={clsx(linkText, 'justify-center sm:px-2')}>
                        Pilih layanan lain
                      </Link>
                      <p id={`ulang-${v.id}`} className="w-full text-[13px] text-slate-600 dark:text-slate-400">
                        Kendaraan, bengkel{firstService ? `, dan ${firstService}` : ''} langsung terpilih di form booking.
                      </p>
                    </>
                  ) : (
                    <Link href={`/booking/new?vehicle_id=${v.id}`} className={btnSecondary}>
                      <CalendarPlus className="h-4 w-4" aria-hidden />
                      Booking untuk kendaraan ini
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
  const [picked, setPicked] = useState<ServiceCategoryId | null>(null);
  const activeCat = picked && grouped.has(picked) ? picked : cats[0]?.id ?? null;
  const list = activeCat ? grouped.get(activeCat) ?? [] : [];

  return (
    <section aria-labelledby="layanan-title" className="space-y-6">
      <div className="max-w-2xl space-y-2">
        <h2 id="layanan-title" className={h2}>
          Layanan dan harga
        </h2>
        <p className={lead}>Harga dan durasi ini yang dipakai untuk menghitung estimasi di form booking.</p>
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
        <>
          {cats.length > 1 && (
            <div role="tablist" aria-label="Kategori layanan" className="flex flex-wrap gap-2">
              {cats.map((c) => {
                const on = c.id === activeCat;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setPicked(c.id)}
                    className={clsx(
                      'min-h-[44px] rounded-chip border px-4 text-[15px] font-semibold transition-colors',
                      on
                        ? 'border-primary-600 bg-primary-600 text-white'
                        : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800'
                    )}
                  >
                    {c.label}
                    <span className={clsx('ml-1.5 text-sm', on ? 'text-primary-100' : 'text-slate-500 dark:text-slate-400')}>
                      {grouped.get(c.id)?.length}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <ul role="tabpanel" className="grid gap-3 md:grid-cols-2">
            {list.map((s) => (
              <li
                key={s.id}
                className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="min-w-0">
                  <Link
                    href={`/services/${s.id}`}
                    className="font-bold text-slate-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-100"
                  >
                    {s.name}
                  </Link>
                  {s.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{s.description}</p>
                  )}
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-600 dark:text-slate-400">
                    <span className="text-lg font-extrabold text-slate-900 dark:text-white">{formatRp(s.price)}</span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" aria-hidden />
                      {formatDuration(s.duration_minutes)}
                    </span>
                  </p>
                </div>
                <Link
                  href={`/booking/new?service_id=${s.id}`}
                  aria-label={`Booking ${s.name}`}
                  className={clsx(btnSecondary, 'shrink-0')}
                >
                  Booking
                </Link>
              </li>
            ))}
          </ul>
        </>
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
      <div className="max-w-2xl space-y-2">
        <h2 id="promo-title" className={h2}>
          Promo yang bisa langsung dipakai
        </h2>
        <p className={lead}>
          Pakai kodenya di ringkasan booking. Diskon langsung dipotong dari estimasi biaya layanan yang kamu pilih.
        </p>
      </div>

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
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {promos.map((p) => (
            <li key={p.id} className={clsx(card, 'flex flex-col gap-4 p-6')}>
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-plate bg-slate-900 px-3 py-1.5 font-mono text-[15px] font-semibold tracking-wide text-white ring-1 ring-inset ring-white/25 dark:bg-slate-950 dark:outline dark:outline-1 dark:outline-slate-600">
                  <span className="sr-only">Kode promo </span>
                  {p.code}
                </span>
                <span className="text-[26px] font-extrabold text-orange-700 dark:text-orange-400">
                  {p.discount_type === 'nominal' ? formatRp(p.discount_value) : `${p.discount_percent}%`}
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{p.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{p.description}</p>
              </div>

              <div className="mt-auto space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                {/* Aturan yang benar-benar diterapkan server (computePromoDiscount di packages/shared). */}
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {promoSummary(p)} dari estimasi layanan yang kamu pilih saat booking.
                  {p.min_spend ? ` Minimal belanja ${formatRp(p.min_spend)}.` : ''}
                </p>
                <p className="inline-flex items-center gap-1.5 text-[13px] text-slate-600 dark:text-slate-400">
                  <Tag className="h-3.5 w-3.5" aria-hidden />
                  {p.valid_until ? `Berlaku sampai ${fullDate(p.valid_until)}` : 'Tanpa batas waktu'}
                </p>
                <Link href={`/booking/new?promo=${encodeURIComponent(p.code)}`} className={clsx(btnSecondary, 'w-full')}>
                  Booking pakai {p.code}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
