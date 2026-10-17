'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CalendarPlus, Car, Clock, MapPin, Phone, Tag } from 'lucide-react';
import { clsx } from 'clsx';
import { fetcher } from '@/lib/fetcher';
import { formatDate, formatDuration, formatRp, shortBranchName } from '@/lib/format';
import { OPERATING_SLOTS } from '@/lib/wib';
import { WorkshopHero } from '@/components/illustrations/workshop';
import { Plate } from '@/components/customer/plate';
import { EmptyState, ErrorState, SkeletonBlock } from '@/components/customer/states';
import { SERVICE_CATEGORIES, getServiceCategory, type ServiceCategoryId } from '@/components/customer/booking/service-selector';

/*
 * Landing untuk tamu (desain: canvas "ServiceGo Landing Page" di Claude Design).
 * Semua data (layanan, lokasi bengkel, promo) diambil dari API publik. Gambar bengkel adalah
 * ilustrasi SVG buatan sendiri; potongan tampilan aplikasi di hero & fitur diberi label "Contoh".
 */

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number | string;
  duration_minutes: number;
  is_active: boolean;
}

interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
}

interface Promo {
  id: string;
  code: string;
  title: string;
  description: string;
  discount_percent: number;
  valid_until: string;
  is_active: boolean;
}

const ctaAccent =
  'inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-ctl bg-accent-500 px-6 text-[17px] font-bold text-slate-950 hover:bg-accent-600 transition-colors';
const ctaGhost =
  'inline-flex min-h-[52px] items-center justify-center rounded-ctl border border-slate-300 bg-white px-6 text-[17px] font-semibold text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800 transition-colors';
const card = 'rounded-[20px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';
const h2 = 'text-[30px] sm:text-[40px] font-extrabold leading-[1.1] tracking-[-0.015em] text-slate-900 dark:text-white';
const lead = 'text-[17px] leading-relaxed text-slate-600 dark:text-slate-400';
const eyebrow = 'text-[15px] font-bold text-primary-700 dark:text-primary-100';

/** "08.00 sampai 16.00 WIB", dari jam slot yang dipakai API booking. */
const SLOT_RANGE = `${OPERATING_SLOTS[0].replace(':', '.')} sampai ${OPERATING_SLOTS[OPERATING_SLOTS.length - 1].replace(':', '.')} WIB`;

export function GuestLanding() {
  const branchesQuery = useQuery<Branch[]>({ queryKey: ['branches'], queryFn: () => fetcher('/branches') });
  const mainBranch = branchesQuery.data?.[0] ?? null;

  return (
    <div className="space-y-20 sm:space-y-24">
      <Hero branch={mainBranch} />
      <Facts branches={branchesQuery.data} />
      <Features />
      <PriceSection />
      <HowItWorks />
      <LocationSection query={branchesQuery} />
      <PromoSection />
      <FinalCta />
    </div>
  );
}

// ---------------------------------------------------------------------------

function Hero({ branch }: { branch: Branch | null }) {
  return (
    <section aria-labelledby="hero-title" className="grid items-center gap-10 pt-4 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pt-10">
      <div className="space-y-6">
        <h1
          id="hero-title"
          className="text-[38px] sm:text-[52px] lg:text-[56px] font-extrabold leading-[1.05] tracking-[-0.02em] text-slate-900 dark:text-white"
        >
          Servis kendaraan tanpa antre telepon, tanpa tebak-tebak biaya.
        </h1>
        <p className="max-w-xl text-[18px] leading-relaxed text-slate-600 dark:text-slate-400">
          Pilih layanan dan jam datang langsung dari HP. Estimasi biaya muncul sebelum kamu konfirmasi, dan
          status pengerjaan bisa dipantau sampai kendaraan siap diambil.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href="/booking/new" className={ctaAccent}>
            <CalendarPlus className="h-5 w-5" aria-hidden />
            Booking servis sekarang
          </Link>
          <a href="#harga" className={ctaGhost}>
            Lihat harga layanan
          </a>
        </div>
        {branch && (
          <p className="flex flex-wrap items-center gap-x-2 text-[15px] text-slate-700 dark:text-slate-300">
            <MapPin className="h-5 w-5 shrink-0 text-primary-600 dark:text-primary-500" aria-hidden />
            <span>
              <span className="sr-only">Lokasi bengkel: </span>
              {branch.name}, {shortAddress(branch.address)}
            </span>
            <a
              href="#lokasi"
              className="-my-3 inline-flex min-h-[44px] items-center font-semibold text-primary-700 hover:underline dark:text-primary-100"
            >
              Lihat peta
            </a>
          </p>
        )}
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Untuk mobil dan motor. Sudah punya akun?{' '}
          <Link href="/login" className="font-semibold text-primary-700 hover:underline dark:text-primary-100">
            Masuk
          </Link>
        </p>
      </div>

      <div className="relative pb-10">
        <div className="relative h-[300px] overflow-hidden rounded-3xl bg-slate-100 sm:h-[440px] dark:bg-slate-800">
          <WorkshopHero cover label="Ilustrasi bengkel ServiceGo: mobil di atas lift sedang diperiksa mekanik" />
          <span className="absolute right-4 top-4 rounded-chip bg-slate-950/75 px-2.5 py-1.5 text-xs font-semibold text-white">
            Contoh tampilan status
          </span>
        </div>
        <StatusCardExample className="absolute bottom-0 left-4 right-4 sm:left-auto sm:right-auto sm:-left-6 sm:w-[330px]" />
      </div>
    </section>
  );
}

/** Ilustrasi kartu status booking (bukan data asli; diberi label di atas gambar). */
function StatusCardExample({ className }: { className?: string }) {
  return (
    <div
      aria-label="Contoh kartu status booking"
      className={clsx(
        'space-y-3.5 rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_24px_48px_-16px_rgba(15,23,42,0.28)] dark:border-slate-700 dark:bg-slate-900',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full border border-primary-100 bg-primary-50 px-2.5 py-1 text-[13px] font-semibold text-primary-700 dark:border-primary-900 dark:bg-primary-900/40 dark:text-primary-100">
          Sedang dikerjakan
        </span>
        <span className="font-mono text-xs text-slate-600 dark:text-slate-400">SG-3F9A21C7</span>
      </div>
      <div className="flex items-center gap-2.5">
        <Plate number="B 1234 XYZ" size="md" />
        <span className="text-[15px] font-semibold text-slate-900 dark:text-white">Toyota Avanza</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5" aria-hidden>
        <span className="h-1.5 rounded bg-primary-600" />
        <span className="h-1.5 rounded bg-primary-600" />
        <span className="h-1.5 rounded bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
        <span>Diterima</span>
        <span className="font-semibold text-slate-900 dark:text-white">Dikerjakan</span>
        <span>Siap diambil</span>
      </div>
      <div className="flex items-baseline justify-between border-t border-slate-200 pt-3 text-sm dark:border-slate-800">
        <span className="text-slate-600 dark:text-slate-400">Estimasi biaya</span>
        <span className="text-lg font-bold text-slate-900 dark:text-white">Rp 325.000</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Facts({ branches }: { branches?: Branch[] }) {
  // Kota diambil dari alamat bengkel asli (kata terakhir setelah koma).
  const cities = useMemo(() => {
    if (!branches?.length) return null;
    const set = new Set(
      branches.map((b) => b.address.split(',').pop()!.trim().replace(/^(Kota|Kabupaten)\s+/i, '')).filter(Boolean)
    );
    return Array.from(set).join(', ');
  }, [branches]);

  const count = branches?.length ?? 0;
  const items = [
    {
      icon: MapPin,
      // Satu bengkel: tampilkan nama & kotanya. Lebih dari satu: jumlah lokasi dari data asli.
      title: count === 1 ? branches![0].name : count > 1 ? `${count} lokasi bengkel` : 'Bengkel ServiceGo',
      text: cities ? (count === 1 ? `Kota ${cities}` : cities) : 'Lihat lokasi bengkel di bawah'
    },
    { icon: Clock, title: 'Slot per jam', text: `${SLOT_RANGE}, pilih yang masih kosong` },
    { icon: Car, title: 'Mobil & motor', text: 'Simpan beberapa kendaraan di satu akun' }
  ];

  return (
    <section aria-label="Sekilas ServiceGo" className="-mt-8 sm:-mt-12">
      <ul className={clsx(card, 'grid divide-y divide-slate-200 md:grid-cols-3 md:divide-x md:divide-y-0 dark:divide-slate-800')}>
        {items.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-start gap-3.5 px-6 py-5 sm:px-7 sm:py-6">
            <Icon className="mt-0.5 h-6 w-6 shrink-0 text-primary-600 dark:text-primary-500" aria-hidden />
            <div>
              <p className="text-[17px] font-bold text-slate-900 dark:text-white">{title}</p>
              <p className="mt-0.5 text-[15px] text-slate-600 dark:text-slate-400">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------

function Feature({
  label,
  title,
  text,
  reverse,
  children
}: {
  label: string;
  title: string;
  text: string;
  reverse?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
      <div className={clsx('space-y-4', reverse && 'lg:order-2')}>
        <p className={eyebrow}>{label}</p>
        <h2 className={h2}>{title}</h2>
        <p className={clsx(lead, 'max-w-[480px]')}>{text}</p>
      </div>
      <div className="relative">
        {children}
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Contoh tampilan di aplikasi</p>
      </div>
    </div>
  );
}

const SLOT_EXAMPLE = [
  { t: '08:00' },
  { t: '09:00', on: true },
  { t: '10:00', full: true },
  { t: '11:00' },
  { t: '13:00' },
  { t: '14:00' },
  { t: '15:00', full: true },
  { t: '16:00' }
];

function Features() {
  return (
    <section aria-label="Kenapa booking lewat ServiceGo" className="space-y-20 sm:space-y-24">
      <Feature
        label="Jadwal"
        title="Pilih jam datang yang masih kosong."
        text="Slot dihitung dari kapasitas bengkel per jam. Jam yang sudah penuh tidak bisa dipilih, jadi kamu tidak datang lalu disuruh menunggu."
      >
        <div className={clsx(card, 'space-y-4 p-6 sm:p-7')} aria-hidden>
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-bold text-slate-900 dark:text-white">Jam datang</span>
            <span className="text-sm text-slate-600 dark:text-slate-400">Pilih tanggal dulu</span>
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            {SLOT_EXAMPLE.map((s) => (
              <span
                key={s.t}
                className={clsx(
                  'flex h-[52px] flex-col items-center justify-center rounded-ctl text-[15px] font-semibold',
                  s.on && 'bg-primary-600 font-bold text-white',
                  s.full && 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                  !s.on && !s.full && 'border border-slate-300 text-slate-900 dark:border-slate-700 dark:text-white'
                )}
              >
                {s.t}
                {s.full && <span className="text-[11px] font-medium">Penuh</span>}
              </span>
            ))}
          </div>
        </div>
      </Feature>

      <Feature
        reverse
        label="Biaya"
        title="Tahu estimasinya sebelum datang."
        text="Harga tiap layanan tampil di depan. Kode promo langsung memotong estimasi di ringkasan booking, bukan dijanjikan nanti di kasir."
      >
        <div className={clsx(card, 'space-y-3 p-6 sm:p-7')} aria-hidden>
          <p className="mb-1 text-lg font-bold text-slate-900 dark:text-white">Ringkasan</p>
          {[
            ['Ganti oli mesin + filter', 175000],
            ['Servis rem & flushing minyak rem', 150000]
          ].map(([n, p]) => (
            <div key={n as string} className="flex justify-between gap-3 text-[15px] text-slate-900 dark:text-slate-100">
              <span>{n}</span>
              <span className="text-slate-700 dark:text-slate-300">{formatRp(p as number)}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 rounded-ctl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
            <span className="font-mono font-semibold">HEMAT20</span>
            <span>diskon 20% dipakai</span>
          </div>
          <div className="space-y-1.5 border-t border-slate-200 pt-3.5 dark:border-slate-800">
            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
              <span>Subtotal</span>
              <span>{formatRp(325000)}</span>
            </div>
            <div className="flex justify-between text-sm text-emerald-700 dark:text-emerald-300">
              <span>Diskon HEMAT20</span>
              <span>-{formatRp(65000)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-semibold text-slate-900 dark:text-white">Estimasi biaya</span>
              <span className="text-[28px] font-extrabold text-slate-900 dark:text-white">{formatRp(260000)}</span>
            </div>
          </div>
        </div>
      </Feature>

      <Feature
        label="Status"
        title="Pantau dari HP, sampai siap diambil."
        text="Status berubah saat mekanik mulai dan selesai bekerja. Foto kondisi kendaraan saat datang dan saat selesai ikut tersimpan di riwayat."
      >
        <ol className={clsx(card, 'space-y-5 p-6 sm:p-7')} aria-hidden>
          {[
            ['bg-amber-500', 'Booking diterima', 'Menunggu konfirmasi bengkel'],
            ['bg-primary-600', 'Mulai dikerjakan', 'Mekanik dan jam mulai tercatat'],
            ['bg-green-600', 'Selesai, siap diambil', 'Notifikasi masuk ke akun kamu']
          ].map(([dot, t, d]) => (
            <li key={t} className="flex gap-3.5">
              <span className={clsx('mt-1.5 h-3 w-3 shrink-0 rounded-full', dot)} />
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{t}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </Feature>
    </section>
  );
}

// ---------------------------------------------------------------------------

function PriceSection() {
  const { data, isLoading, isError, error, refetch } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: () => fetcher('/services')
  });
  const services = useMemo(() => (data ?? []).filter((s) => s.is_active), [data]);

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
  const active = picked && grouped.has(picked) ? picked : cats[0]?.id ?? null;
  const list = active ? grouped.get(active) ?? [] : [];

  return (
    <section id="harga" aria-labelledby="harga-title" className="scroll-mt-24 space-y-7">
      <div className="max-w-2xl space-y-3">
        <h2 id="harga-title" className={h2}>
          Layanan dan harga
        </h2>
        <p className={lead}>Harga dan durasi yang sama dipakai untuk menghitung estimasi di form booking.</p>
      </div>

      {isLoading && (
        <div className="grid gap-3 md:grid-cols-2" aria-busy>
          {[0, 1, 2, 3].map((i) => (
            <SkeletonBlock key={i} className="h-28" />
          ))}
        </div>
      )}
      {isError && (
        <ErrorState title="Daftar layanan belum bisa dimuat" message={(error as Error)?.message} onRetry={() => refetch()} />
      )}
      {!isLoading && !isError && services.length === 0 && (
        <EmptyState title="Belum ada layanan aktif" description="Layanan yang dibuka bengkel akan tampil di sini." />
      )}

      {cats.length > 0 && (
        <>
          {cats.length > 1 && (
            <div role="tablist" aria-label="Kategori layanan" className="flex flex-wrap gap-2">
              {cats.map((c) => {
                const on = c.id === active;
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
              <li key={s.id}>
                <Link
                  href={`/services/${s.id}`}
                  className="flex h-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 transition-colors hover:border-primary-600 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary-500"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white">{s.name}</p>
                    {s.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{s.description}</p>
                    )}
                    <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-slate-600 dark:text-slate-400">
                      <Clock className="h-3.5 w-3.5" aria-hidden />
                      {formatDuration(s.duration_minutes)}
                    </p>
                  </div>
                  <p className="whitespace-nowrap text-lg font-extrabold text-slate-900 dark:text-white">{formatRp(s.price)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------

const STEPS = [
  ['Kendaraan', 'Pilih mobil atau motor yang sudah kamu simpan, atau tambahkan yang baru.'],
  ['Layanan', 'Centang satu atau beberapa layanan. Estimasi biaya langsung terhitung.'],
  ['Jadwal', 'Pilih tanggal dan jam datang yang masih kosong di bengkel, lalu konfirmasi.']
];

function HowItWorks() {
  return (
    <section
      id="cara"
      aria-labelledby="cara-title"
      className="scroll-mt-24 rounded-[28px] bg-slate-900 px-6 py-14 text-white sm:px-12 sm:py-16 dark:bg-slate-950 dark:ring-1 dark:ring-slate-800"
    >
      <div className="max-w-2xl space-y-3">
        <h2 id="cara-title" className="text-[30px] sm:text-[40px] font-extrabold leading-[1.1] tracking-[-0.015em]">
          Booking dalam tiga langkah
        </h2>
        <p className="text-[17px] leading-relaxed text-slate-300">
          Bisa dilihat tanpa akun. Untuk konfirmasi, masuk atau daftar di langkah terakhir.
        </p>
      </div>
      <ol className="mt-10 grid gap-6 sm:grid-cols-3">
        {STEPS.map(([t, d], i) => {
          const last = i === STEPS.length - 1;
          return (
            <li key={t} className={clsx('space-y-2.5 border-t-2 pt-4', last ? 'border-accent-500' : 'border-primary-500')}>
              <span className={clsx('font-mono text-sm font-semibold', last ? 'text-orange-300' : 'text-blue-300')}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="text-[19px] font-bold">{t}</p>
              <p className="text-[15px] leading-relaxed text-slate-300">{d}</p>
            </li>
          );
        })}
      </ol>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link href="/booking/new" className={ctaAccent}>
          Mulai booking
        </Link>
        <Link
          href="/register"
          className="inline-flex min-h-[52px] items-center justify-center rounded-ctl border border-slate-600 px-6 text-[17px] font-semibold text-white hover:bg-slate-800 transition-colors"
        >
          Daftar akun gratis
        </Link>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

/** "Jl. Margonda Raya No. 45, Beji, Kota Depok" menjadi "Beji, Kota Depok" (tanpa nama jalan). */
function shortAddress(address: string) {
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  return parts.length > 1 ? parts.slice(1).join(', ') : address;
}

const mapEmbedUrl = (address: string) => `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
const mapSearchUrl = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

function LocationSection({
  query
}: {
  query: { data?: Branch[]; isLoading: boolean; isError: boolean; error: unknown; refetch: () => unknown };
}) {
  const branches = query.data ?? [];
  const main = branches[0] ?? null;
  const others = branches.slice(1);
  const tel = (phone: string) => phone.replace(/[^0-9+]/g, '');

  return (
    <section id="lokasi" aria-labelledby="lokasi-title" className="scroll-mt-24">
      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr] lg:gap-6">
        {/* Peta: alamat dari API, jadi ubah alamat di database langsung mengubah peta. */}
        <div className="relative h-80 min-h-[320px] overflow-hidden rounded-[28px] border border-slate-200 bg-slate-100 lg:h-full lg:min-h-[440px] dark:border-slate-800 dark:bg-slate-800">
          {query.isLoading && <SkeletonBlock className="absolute inset-0 h-full w-full" />}
          {!query.isLoading && main && (
            <iframe
              src={mapEmbedUrl(main.address)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Peta lokasi ${main.name}`}
              className="absolute inset-0 h-full w-full border-0"
              allowFullScreen
            />
          )}
          {!query.isLoading && !main && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-slate-600 dark:text-slate-400">
              <MapPin className="h-8 w-8" aria-hidden />
              <p className="text-sm">{query.isError ? 'Peta belum bisa ditampilkan.' : 'Peta akan tampil setelah lokasi bengkel terdaftar.'}</p>
            </div>
          )}
        </div>

        <div className={clsx(card, 'flex flex-col gap-5 rounded-[28px] p-6 sm:p-8 lg:p-10')}>
          <div className="space-y-2">
            <p className={eyebrow}>Lokasi bengkel</p>
            <h2 id="lokasi-title" className="text-[28px] sm:text-[34px] font-extrabold leading-[1.1] tracking-[-0.015em] text-slate-900 dark:text-white">
              {main ? main.name : 'Bengkel ServiceGo'}
            </h2>
          </div>

          {query.isLoading && (
            <div className="space-y-3" aria-busy>
              <SkeletonBlock className="h-5 w-4/5" />
              <SkeletonBlock className="h-5 w-2/5" />
              <SkeletonBlock className="h-5 w-3/5" />
              <SkeletonBlock className="mt-4 h-[52px] w-full sm:w-48" />
            </div>
          )}
          {query.isError && (
            <ErrorState
              title="Data lokasi belum bisa dimuat"
              message={(query.error as Error)?.message}
              onRetry={() => query.refetch()}
            />
          )}
          {!query.isLoading && !query.isError && !main && (
            <EmptyState icon={MapPin} title="Lokasi bengkel belum terdaftar" />
          )}

          {main && (
            <>
              <ul className="space-y-3.5 text-[15px] text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary-600 dark:text-primary-500" aria-hidden />
                  <span>
                    <span className="sr-only">Alamat: </span>
                    {main.address}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary-600 dark:text-primary-500" aria-hidden />
                  <span>
                    <span className="sr-only">Jam datang: </span>
                    Slot datang {SLOT_RANGE}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-5 w-5 shrink-0 text-primary-600 dark:text-primary-500" aria-hidden />
                  <a
                    href={`tel:${tel(main.phone)}`}
                    className="-my-3 inline-flex min-h-[44px] items-center font-mono font-semibold text-primary-700 hover:underline dark:text-primary-100"
                  >
                    <span className="sr-only">Telepon </span>
                    {main.phone}
                  </a>
                </li>
              </ul>
              <p className="text-sm text-slate-600 dark:text-slate-400">Telepon bengkel kalau perlu ubah jadwal.</p>
              <div className="mt-auto flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap">
                <Link
                  href={`/booking/new?branch_id=${main.id}`}
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-ctl bg-primary-600 px-6 text-[17px] font-bold text-white hover:bg-primary-700 transition-colors"
                >
                  <CalendarPlus className="h-5 w-5" aria-hidden />
                  Booking di sini
                </Link>
                <a href={mapSearchUrl(main.address)} target="_blank" rel="noopener noreferrer" className={ctaGhost}>
                  Buka di Google Maps
                  <span className="sr-only"> (tab baru)</span>
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Data lama dengan lebih dari satu lokasi tetap ditampilkan ringkas. */}
      {others.length > 0 && (
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {others.map((b) => (
            <li key={b.id} className={clsx(card, 'flex flex-wrap items-center justify-between gap-3 p-5')}>
              <div className="min-w-0">
                <p className="font-bold text-slate-900 dark:text-white">{shortBranchName(b.name)}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{b.address}</p>
              </div>
              <Link
                href={`/booking/new?branch_id=${b.id}`}
                className="inline-flex min-h-[44px] items-center rounded-ctl border border-slate-300 px-3.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800 transition-colors"
              >
                Booking di sini
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------

function PromoSection() {
  const { data, isLoading, isError, error, refetch } = useQuery<Promo[]>({
    queryKey: ['promos'],
    queryFn: () => fetcher('/promos')
  });
  const promos = (data ?? []).filter((p) => p.is_active);
  if (!isLoading && !isError && promos.length === 0) return null; // tidak ada promo: bagian disembunyikan

  return (
    <section id="promo" aria-labelledby="promo-title" className="scroll-mt-24 space-y-7">
      <div className="max-w-2xl space-y-3">
        <h2 id="promo-title" className={h2}>
          Promo yang bisa langsung dipakai
        </h2>
        <p className={lead}>Masukkan kode di ringkasan booking. Diskon dipotong dari estimasi biaya layanan yang kamu pilih.</p>
      </div>
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-3" aria-busy>
          {[0, 1, 2].map((i) => (
            <SkeletonBlock key={i} className="h-48" />
          ))}
        </div>
      )}
      {isError && <ErrorState title="Promo belum bisa dimuat" message={(error as Error)?.message} onRetry={() => refetch()} />}
      {promos.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-3">
          {promos.map((p) => (
            <li key={p.id} className={clsx(card, 'flex flex-col gap-3.5 p-6')}>
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-plate bg-slate-900 px-3 py-1.5 font-mono text-[15px] font-semibold tracking-wide text-white ring-1 ring-inset ring-white/25 dark:bg-slate-950 dark:outline dark:outline-1 dark:outline-slate-600">
                  <span className="sr-only">Kode promo </span>
                  {p.code}
                </span>
                <span className="text-[26px] font-extrabold text-orange-700 dark:text-orange-400">{p.discount_percent}%</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{p.title}</h3>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{p.description}</p>
              <p className="mt-auto inline-flex items-center gap-1.5 text-[13px] text-slate-600 dark:text-slate-400">
                <Tag className="h-3.5 w-3.5" aria-hidden />
                Berlaku sampai {formatDate(p.valid_until, { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <Link
                href={`/booking/new?promo=${encodeURIComponent(p.code)}`}
                className="inline-flex min-h-[44px] items-center justify-center rounded-ctl border border-slate-300 px-4 text-[15px] font-semibold text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800 transition-colors"
              >
                Booking pakai {p.code}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------

function FinalCta() {
  return (
    <section className="flex flex-col gap-7 rounded-[28px] bg-primary-600 px-6 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-12 sm:py-14">
      <div className="max-w-xl space-y-2.5">
        <h2 className="text-[30px] sm:text-[40px] font-extrabold leading-[1.1] tracking-[-0.015em] text-white">
          Servis berikutnya, booking dari sini.
        </h2>
        <p className="text-[17px] leading-relaxed text-blue-100">
          Simpan kendaraanmu sekali, booking ulang tinggal beberapa ketuk.
        </p>
      </div>
      <Link href="/booking/new" className={clsx(ctaAccent, 'min-h-[56px] shrink-0 text-lg')}>
        Booking servis sekarang
      </Link>
    </section>
  );
}
