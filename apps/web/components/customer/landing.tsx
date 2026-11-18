'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CalendarPlus, Car, ChevronDown, Clock, Cog, Disc3, Droplets, LayoutGrid, MapPin, Phone, Search, Snowflake, Sparkles, Tag, Wrench, Zap } from 'lucide-react';
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
const eyebrow = 'text-[15px] font-bold text-slate-500 dark:text-slate-400';

/** "08.00 sampai 16.00 WIB", dari jam slot yang dipakai API booking. */
const SLOT_RANGE = `${OPERATING_SLOTS[0].replace(':', '.')} sampai ${OPERATING_SLOTS[OPERATING_SLOTS.length - 1].replace(':', '.')} WIB`;

export function GuestLanding() {
  const branchesQuery = useQuery<Branch[]>({ queryKey: ['branches'], queryFn: () => fetcher('/branches') });
  const mainBranch = branchesQuery.data?.[0] ?? null;

  return (
    <div className="space-y-20 sm:space-y-24 overflow-x-clip">
      {/* Dibungkus satu div agar space-y parent tidak menyisipkan celah putih antara hero & strip */}
      <div>
        <Hero branch={mainBranch} />
        <CategoryStrip />
      </div>
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 space-y-20 sm:space-y-24">
        <PriceSection />
        <PromoSection />
        <LocationSection query={branchesQuery} />
        <HowItWorks />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Hero({ branch }: { branch: Branch | null }) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    // Fallback: pastikan animasi muncul jika onTimeUpdate tidak tertangkap
    const timer = setTimeout(() => setRevealed(true), 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      aria-label="Hero ServiceGo Video"
      className="relative w-full h-screen min-h-[640px] max-h-[1080px] overflow-hidden bg-black flex flex-col justify-between"
    >
      <video
        ref={(el) => {
          if (el) {
            el.setAttribute('muted', '');
            el.defaultMuted = true;
            el.muted = true;
            el.play().catch(() => {});
          }
        }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          // Munculkan animasi saat mobil sudah mendekat
          if (v.currentTime >= 2.5 || v.ended) {
            setRevealed(true);
          }
        }}
        onEnded={() => setRevealed(true)}
        src="/car-moving.mp4"
        autoPlay
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Subtle cinematic gradient vignette: gelap atas untuk navbar, gelap bawah untuk CTA */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black pointer-events-none" />

      {/* Tengah kiri: headline + CTA booking, mengisi area kosong di samping mobil */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 items-center px-4 sm:px-6 lg:px-8">
        {/* Tiap elemen masuk sendiri-sendiri dari luar layar kiri, berurutan (delay beda) */}
        <div
          className={clsx(
            'flex flex-col items-start text-left gap-4 max-w-md [&>*]:transition-all [&>*]:duration-1000 [&>*]:ease-out motion-reduce:[&>*]:transition-none',
            revealed
              ? '[&>*]:translate-x-0 [&>*]:opacity-100'
              : '[&>*]:-translate-x-[100vw] [&>*]:opacity-0 pointer-events-none'
          )}
        >
          <h2 className="delay-300 text-[34px] sm:text-[48px] font-bold text-white leading-[1.1] tracking-tight drop-shadow-md">
            Servis cepat,
            <br />
            hasil rapi
          </h2>
          <p className="delay-[650ms] max-w-[300px] text-base sm:text-lg text-slate-200 drop-shadow">
            Booking online tanpa antre, dikerjakan mekanik berpengalaman
          </p>
          {/* wrapper supaya animasi masuk tidak bentrok dengan hover scale tombol */}
          <div className="delay-1000 mt-1">
            <Link
              href="/booking/new"
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-white px-7 text-[15px] font-semibold text-slate-950 transition-all duration-300 hover:scale-105 hover:bg-slate-100 active:scale-95"
            >
              Booking Sekarang
            </Link>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: metrik bengkel di kanan */}
      <div className="relative z-10 mx-auto w-full max-w-[1440px] px-4 pb-8 sm:px-6 sm:pb-12 lg:px-8 flex justify-center">

        {/* Kanan: Quick Specs / Metrik Bengkel (seperti metrik 0-100km/h di referensi Lumen S) */}
        <div
          className={clsx(
            'hidden sm:flex items-center gap-6 md:gap-8 text-center transition-all duration-1000 delay-500 ease-out select-none',
            revealed ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'
          )}
        >
          <div className="space-y-0.5">
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Jam Operasional</p>
            <p className="text-base sm:text-lg font-bold text-white">08.00 - 16.00 WIB</p>
          </div>
          <div className="h-8 w-px bg-white/20" />
          <div className="space-y-0.5">
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Layanan Tersedia</p>
            <p className="text-base sm:text-lg font-bold text-white">22+ Paket</p>
          </div>
          <div className="h-8 w-px bg-white/20" />
          <div className="space-y-0.5">
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Rating Pelanggan</p>
            <p className="text-base sm:text-lg font-bold text-white">★ 4.9 / 5.0</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Strip kategori layanan gaya "Performance Tuning Services": latar gelap, ikon aksen, 6 kolom. */
function CategoryStrip() {
  const items = [
    { icon: Cog, title: 'Servis Mesin', desc: 'Tune-up menyeluruh agar performa mesin tetap maksimal.' },
    { icon: Droplets, title: 'Oli & Cairan', desc: 'Ganti oli, radiator, dan cairan vital tepat takaran.' },
    { icon: Disc3, title: 'Sistem Rem', desc: 'Kampas, rotor, dan kaliper demi pengereman pakem.' },
    { icon: Zap, title: 'Kelistrikan', desc: 'Aki, starter, hingga diagnosa OBD2 akurat.' },
    { icon: Snowflake, title: 'Servis AC', desc: 'Kabin sejuk kembali, freon dan filter terjaga.' },
    { icon: Car, title: 'Kaki-kaki', desc: 'Spooring, balancing, dan shockbreaker nyaman.' }
  ];
  return (
    <section aria-label="Kategori layanan" className="bg-black">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-4">
        <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
          {items.map(({ icon: Icon, title, desc }) => (
            <li key={title} className="flex flex-col items-center text-center gap-3">
              <Icon className="h-10 w-10 text-accent-500" strokeWidth={1.5} aria-hidden />
              <p className="text-[13px] font-bold uppercase tracking-wider text-white">{title}</p>
              <p className="text-[12px] leading-relaxed text-slate-400">{desc}</p>
            </li>
          ))}
        </ul>
      </div>
      {/* Transisi gelap -> abu-abu -> putih dengan tepi gelombang, bukan garis lurus */}
      <div aria-hidden className="relative h-14 sm:h-20 bg-black">
        <svg
          className="absolute inset-x-0 bottom-0 h-full w-full"
          viewBox="0 0 1440 64"
          preserveAspectRatio="none"
          fill="var(--bg-base)"
        >
          <path d="M0 64 L0 40 C 240 0, 480 64, 720 40 C 960 16, 1200 48, 1440 16 L1440 64 Z" />
        </svg>
      </div>
    </section>
  );
}


// ---------------------------------------------------------------------------

/** Ikon per kategori untuk tile gambar di kartu layanan (dipakai juga sebagai "gambar" kategori). */
const CATEGORY_ICONS: Record<ServiceCategoryId, typeof Cog> = {
  mesin: Cog,
  oli: Droplets,
  rem: Disc3,
  kelistrikan: Zap,
  ac: Snowflake,
  'kaca-film': Sparkles,
  'kaki-kaki': Car
};

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
  const [picked, setPicked] = useState<ServiceCategoryId | 'all'>('all');
  const [catsOpen, setCatsOpen] = useState(true);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<Service | null>(null);
  const active = picked !== 'all' && grouped.has(picked) ? picked : 'all';
  const q = search.trim().toLowerCase();
  // Saat mencari: cari di semua kategori, bukan cuma yang dipilih.
  const list = q
    ? services.filter((s) => `${s.name} ${s.description ?? ''}`.toLowerCase().includes(q))
    : active === 'all'
      ? services
      : grouped.get(active) ?? [];

  return (
    <section id="harga" aria-labelledby="harga-title" className="scroll-mt-24 space-y-7">
      <h2 id="harga-title" className={clsx(h2, 'text-center')}>
        Layanan dan harga
      </h2>

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
        <div className="space-y-5">
          <div className="grid gap-6 lg:grid-cols-[240px_1fr] lg:items-start">
          {/* Kiri: panel Kategori, sejajar dengan kartu */}
          <nav aria-label="Kategori layanan" className={clsx(card, 'p-3 space-y-1.5')}>
            <p className="pb-2 pt-1 text-center text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Kategori
            </p>
            <div className="mx-2 mb-1 border-b border-slate-200 dark:border-slate-800" aria-hidden />

            {/* Semua: gabungan seluruh layanan */}
            <button
              type="button"
              aria-pressed={!q && active === 'all'}
              onClick={() => {
                setPicked('all');
                setSearch('');
              }}
              className={clsx(
                'flex w-full min-h-[44px] items-center gap-3 rounded-ctl px-4 text-[15px] font-semibold transition-colors',
                !q && active === 'all'
                  ? 'bg-slate-900 text-white dark:bg-slate-700'
                  : 'text-slate-900 hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800'
              )}
            >
              <LayoutGrid
                className={clsx('h-[18px] w-[18px] shrink-0', !q && active === 'all' ? 'text-white' : 'text-slate-500 dark:text-slate-400')}
                aria-hidden
              />
              <span className="flex-1 text-left">Semua</span>
              <span className={clsx('text-sm', !q && active === 'all' ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400')}>
                {services.length}
              </span>
            </button>

            {/* Dropdown: buka/tutup daftar kategori */}
            <button
              type="button"
              aria-expanded={catsOpen}
              onClick={() => setCatsOpen((v) => !v)}
              className="flex w-full min-h-[44px] items-center gap-3 rounded-ctl px-4 text-[15px] font-semibold text-slate-900 transition-colors hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800"
            >
              <span className="flex-1 text-left">Per kategori</span>
              <ChevronDown
                className={clsx('h-4 w-4 shrink-0 transition-transform', catsOpen && 'rotate-180')}
                aria-hidden
              />
            </button>

            {catsOpen && cats.map((c) => {
              const on = !q && c.id === active;
              const Icon = CATEGORY_ICONS[c.id];
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setPicked(c.id);
                    setSearch('');
                  }}
                  className={clsx(
                    'flex w-full min-h-[44px] items-center gap-3 rounded-ctl px-4 text-[15px] font-semibold transition-colors',
                    on
                      ? 'bg-slate-900 text-white dark:bg-slate-700'
                      : 'text-slate-900 hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800'
                  )}
                >
                  <Icon className={clsx('h-4.5 w-4.5 h-[18px] w-[18px] shrink-0', on ? 'text-white' : 'text-slate-500 dark:text-slate-400')} aria-hidden />
                  <span className="flex-1 text-left">{c.label}</span>
                  <span className={clsx('text-sm', on ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400')}>
                    {grouped.get(c.id)?.length}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Kanan: search bar lalu kartu layanan */}
          <div className="space-y-4">
            <label className="relative block max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari layanan, misal: ganti oli"
                aria-label="Cari layanan"
                className="h-12 w-full rounded-ctl border border-slate-300 bg-white pl-11 pr-4 text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>
            {q && list.length === 0 && (
              <EmptyState icon={Search} title="Tidak ada layanan yang cocok" description={`Tidak ada hasil untuk "${search.trim()}".`} />
            )}
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((s) => {
              const Icon = CATEGORY_ICONS[getServiceCategory(s.name, s.description)];
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setDetail(s)}
                    className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition-colors hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-500"
                  >
                    {/* "Foto" produk: blok gelap + ikon kategori (belum ada aset foto per layanan) */}
                    <span
                      aria-hidden
                      className="flex h-52 w-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-accent-500"
                    >
                      <Icon className="h-16 w-16 transition-transform duration-300 group-hover:scale-110" strokeWidth={1} />
                    </span>
                    <span className="flex w-full flex-1 flex-col p-5">
                      <span className="block leading-snug text-slate-900 dark:text-white">{s.name}</span>
                      <span className="mt-4 flex items-baseline justify-between gap-3">
                        <span className="text-[15px] text-slate-600 dark:text-slate-400">{formatRp(s.price)}</span>
                        <span className="text-[13px] font-semibold text-accent-600 group-hover:underline dark:text-accent-500">
                          Lihat detail
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            </ul>
          </div>
          </div>
        </div>
      )}

      {/* Detail layanan sebagai kartu dialog, bukan halaman */}
      {detail && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Detail ${detail.name}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="flex min-h-[420px] w-full max-w-4xl overflow-hidden rounded-[24px] bg-white shadow-2xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const Icon = CATEGORY_ICONS[getServiceCategory(detail.name, detail.description)];
              const catLabel = SERVICE_CATEGORIES.find(
                (c) => c.id === getServiceCategory(detail.name, detail.description)
              )?.label;
              return (
                <>
                  {/* Kiri: gambar full tinggi kartu (placeholder ikon, siap diganti foto) */}
                  <div className="flex w-2/5 shrink-0 items-center justify-center self-stretch bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-accent-500">
                    <Icon className="h-16 w-16" strokeWidth={1} aria-hidden />
                  </div>
                  {/* Kanan: judul bold, sisanya tidak */}
                  <div className="relative flex flex-1 flex-col gap-4 p-6 sm:p-7">
                    <button
                      type="button"
                      onClick={() => setDetail(null)}
                      aria-label="Tutup detail"
                      className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      ✕
                    </button>
                    <div className="pr-10">
                      {catLabel && (
                        <p className="text-[13px] uppercase tracking-wider text-accent-600 dark:text-accent-500">
                          {catLabel}
                        </p>
                      )}
                      <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{detail.name}</h3>
                    </div>
                    <p className="text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
                      {detail.description || 'Bengkel belum menambahkan deskripsi untuk layanan ini.'}
                    </p>
                    <dl className="mt-auto grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-slate-50 px-5 py-4 dark:bg-slate-800/60">
                        <dt className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                          <Tag className="h-3.5 w-3.5" aria-hidden />
                          Harga
                        </dt>
                        <dd className="mt-1 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
                          {formatRp(detail.price)}
                        </dd>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-5 py-4 dark:bg-slate-800/60">
                        <dt className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                          <Clock className="h-3.5 w-3.5" aria-hidden />
                          Perkiraan durasi
                        </dt>
                        <dd className="mt-1 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
                          {formatDuration(detail.duration_minutes)}
                        </dd>
                      </div>
                    </dl>
                    <Link
                      href={`/booking/new?service_id=${detail.id}`}
                      className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-ctl bg-accent-500 px-6 font-bold text-slate-950 transition-colors hover:bg-accent-600"
                    >
                      <CalendarPlus className="h-5 w-5" aria-hidden />
                      Booking servis ini
                    </Link>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
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
    // Full-bleed: section keluar dari container pakai w-screen + translate
    <section
      id="cara"
      aria-labelledby="cara-title"
      className="relative left-1/2 w-screen -translate-x-1/2 scroll-mt-24 overflow-hidden bg-slate-950 pb-28 pt-16 text-white sm:pb-36 sm:pt-24"
    >
      <div className="mx-auto grid max-w-[1100px] gap-14 px-4 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-16 lg:px-8">
        {/* Kiri: judul + CTA */}
        <div className="space-y-5">
          <h2 id="cara-title" className="text-[32px] sm:text-[42px] font-extrabold leading-[1.08] tracking-[-0.015em]">
            Booking dalam
            <br />
            tiga langkah
          </h2>
          <p className="max-w-[400px] text-[17px] leading-relaxed text-slate-400">
            Bisa dilihat tanpa akun. Untuk konfirmasi, masuk atau daftar di langkah terakhir.
          </p>

          {/* Ajakan booking */}
          <div className="border-t border-slate-800 pt-6">
            <p className="text-[15px] text-slate-400">
              Nggak sampai dua menit, slot langsung terkunci — <span className="font-semibold text-white">gratis batalin</span> kapan saja.
            </p>
            <Link href="/booking/new" className={clsx(ctaAccent, 'mt-5')}>
              Booking sekarang
            </Link>
          </div>
        </div>

        {/* Kanan: timeline vertikal step-by-step */}
        <ol className="relative space-y-12">
          {/* Garis penghubung vertikal */}
          <div aria-hidden className="absolute bottom-6 left-6 top-6 w-px bg-slate-800" />
          {STEPS.map(([t, d], i) => (
            <li key={t} className="relative flex gap-6">
              <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-950 font-mono text-[15px] font-semibold text-white">
                {i + 1}
              </span>
              <div className="pt-2">
                <p className="text-[19px] font-bold">{t}</p>
                <p className="mt-1.5 max-w-[420px] text-[15px] leading-relaxed text-slate-400">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Perbatasan ke footer: gelombang, bukan garis lurus */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 block h-14 w-full fill-white sm:h-20 dark:fill-slate-900"
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
      >
        <path d="M0 80 L0 46 C 240 6, 480 78, 720 44 C 960 10, 1200 62, 1440 22 L1440 80 Z" />
      </svg>
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
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
                  <span>
                    <span className="sr-only">Alamat: </span>
                    {main.address}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
                  <span>
                    <span className="sr-only">Jam datang: </span>
                    Slot datang {SLOT_RANGE}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
                  <a
                    href={`tel:${tel(main.phone)}`}
                    className="-my-3 inline-flex min-h-[44px] items-center font-mono font-semibold text-slate-900 hover:underline dark:text-white"
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
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-ctl bg-slate-900 px-6 text-[17px] font-bold text-white hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
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

  // Voucher mini yang dirender di dalam frame hp/tablet.
  // Tiket dua bagian: stub oranye kiri berisi persen, sobekan berlubang + garis putus-putus di tengah.
  const Voucher = ({ p, compact }: { p: Promo; compact?: boolean }) => (
    <div className="relative flex overflow-hidden rounded-xl bg-white shadow-md dark:bg-slate-800">
      {/* Stub kiri */}
      <div
        className={clsx(
          'flex shrink-0 flex-col items-center justify-center bg-accent-500 text-slate-950',
          compact ? 'w-12' : 'w-16'
        )}
      >
        <span className={clsx('font-extrabold leading-none', compact ? 'text-base' : 'text-xl')}>
          {p.discount_percent}%
        </span>
        <span className="mt-0.5 text-[9px] font-bold uppercase tracking-widest">OFF</span>
      </div>
      {/* Garis sobekan + lubang atas-bawah (warna mengikuti layar perangkat) */}
      <div aria-hidden className="relative w-0 border-l-2 border-dashed border-slate-300 dark:border-slate-600">
        <span className="absolute -left-[7px] -top-[7px] h-3.5 w-3.5 rounded-full bg-slate-50 dark:bg-slate-900" />
        <span className="absolute -bottom-[7px] -left-[7px] h-3.5 w-3.5 rounded-full bg-slate-50 dark:bg-slate-900" />
      </div>
      {/* Isi */}
      <div className={clsx('min-w-0 flex-1', compact ? 'p-2' : 'p-3')}>
        <span className="inline-block rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-white dark:bg-slate-950">
          {p.code}
        </span>
        <p className={clsx('mt-1 font-bold leading-snug text-slate-900 dark:text-white', compact ? 'text-[11px]' : 'text-[13px]')}>
          {p.title}
        </p>
        {!compact && (
          <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500 dark:text-slate-400">{p.description}</p>
        )}
      </div>
    </div>
  );

  return (
    // Full-bleed dengan latar berbeda supaya kepisah jelas dari daftar layanan di atasnya
    <section
      id="promo"
      aria-labelledby="promo-title"
      className="relative left-1/2 w-screen -translate-x-1/2 scroll-mt-24 border-y border-slate-200 bg-gradient-to-b from-slate-100 via-white to-white py-16 sm:py-20 dark:border-slate-800 dark:from-slate-900 dark:via-[var(--bg-base)] dark:to-[var(--bg-base)]"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
      {isLoading && <SkeletonBlock className="h-64" aria-busy />}
      {isError && <ErrorState title="Promo belum bisa dimuat" message={(error as Error)?.message} onRetry={() => refetch()} />}
      {promos.length > 0 && (
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Kiri: teks penjelasan */}
          <div>
            <h2
              id="promo-title"
              className="text-[38px] sm:text-[52px] font-extrabold leading-[1.05] tracking-[-0.02em] text-slate-900 dark:text-white"
            >
              Diskon yang bisa
              <br />
              <span className="text-accent-600 dark:text-accent-500">langsung dipakai</span>
            </h2>
            <p className={clsx(lead, 'mt-5 max-w-[440px]')}>
              Masukkan kode promo di ringkasan booking, potongannya langsung menghitung ulang estimasi biaya.
            </p>
            <ul className="mt-7 space-y-3.5">
              {['Tanpa syarat minimum belanja', 'Berlaku untuk semua kategori layanan', 'Satu kode untuk satu booking'].map(
                (t) => (
                  <li key={t} className="flex items-center gap-3 text-[15px] font-medium text-slate-700 dark:text-slate-300">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-500/15 text-accent-600 dark:text-accent-500">
                      <Tag className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    {t}
                  </li>
                )
              )}
            </ul>
            <Link
              href={`/booking/new?promo=${encodeURIComponent(promos[0].code)}`}
              className="mt-9 inline-flex min-h-[50px] items-center justify-center rounded-ctl bg-slate-900 px-7 font-semibold text-white transition-colors hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              Booking pakai {promos[0].code}
            </Link>
          </div>

          {/* Kanan: mockup tablet + hp berisi voucher */}
          <div aria-hidden className="group relative mx-auto w-full max-w-[520px] select-none pb-8 pr-6">
            {/* Blob gradasi oranye di belakang perangkat */}
            <div
              className="absolute -inset-6 rounded-full opacity-60 blur-3xl"
              style={{ background: 'radial-gradient(closest-side, rgba(249,115,22,0.35), transparent)' }}
            />
            {/* Badge diskon melayang */}
            <div className="absolute -left-5 -top-9 z-10 rotate-[-8deg] rounded-xl bg-accent-500 px-4 py-2 text-lg font-extrabold text-slate-950 shadow-lg">
              -{Math.max(...promos.map((p) => p.discount_percent))}%
            </div>
            {/* Tablet */}
            <div className="relative -rotate-2 rounded-[28px] border-[10px] border-slate-900 bg-slate-50 p-5 shadow-2xl transition-transform duration-500 group-hover:rotate-0 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Voucher kamu
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {promos.slice(0, 4).map((p) => (
                  <Voucher key={p.id} p={p} />
                ))}
              </div>
            </div>
            {/* HP, menimpa pojok kanan bawah tablet */}
            <div className="absolute -bottom-0 -right-0 w-[180px] rotate-3 rounded-[24px] border-[8px] border-slate-900 bg-slate-50 p-2.5 shadow-2xl transition-transform duration-500 group-hover:rotate-0 dark:border-slate-700 dark:bg-slate-900">
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
              <div className="space-y-2">
                {promos.slice(0, 2).map((p) => (
                  <Voucher key={p.id} p={p} compact />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </section>
  );
}

