'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Home, Clock, Newspaper, User, Wrench, Headphones, CalendarPlus, LogOut, MapPin, Phone } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase-client';
import { fetcher } from '@/lib/fetcher';
import { shortBranchName } from '@/lib/format';
import { OPERATING_SLOTS } from '@/lib/wib';
import { ThemeToggle } from '@/components/theme-toggle';
import { useCustomerSupportChat } from '@/lib/support-chat';
import { SupportChatDrawer } from './support-chat-drawer';
import { NotificationPopover } from './notification-popover';

// "Booking" tidak masuk daftar ini karena sudah jadi tombol aksi utama (aksen oranye) di header.
const NAV = [
  { href: '/', label: 'Beranda', icon: Home },
  { href: '/bookings', label: 'Riwayat', icon: Clock },
  { href: '/notifications', label: 'Notifikasi', icon: Newspaper },
  { href: '/profile', label: 'Profil', icon: User }
];

const FOOTER_EXPLORE = [
  { href: '/#harga', label: 'Harga layanan' },
  { href: '/#cara', label: 'Cara kerja' },
  { href: '/#lokasi', label: 'Lokasi bengkel' },
  { href: '/#promo', label: 'Promo' },
  { href: '/booking/new', label: 'Booking servis' }
];

const FOOTER_JAM = `${OPERATING_SLOTS[0].replace(':', '.')} - ${OPERATING_SLOTS[OPERATING_SLOTS.length - 1].replace(':', '.')} WIB`;

interface BranchContact {
  id: string;
  name: string;
  address: string;
  phone: string;
}

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

/** Wordmark raksasa penutup halaman; muncul naik-memudar saat tergulir ke dalam layar. */
function GiantWordmark() {
  const ref = useRef<HTMLParagraphElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setShown(entry.isIntersecting), { rootMargin: '0px 0px -10% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <p
      ref={ref}
      aria-hidden
      // Ukuran ikut lebar layar supaya selalu pas satu baris.
      className="select-none overflow-hidden whitespace-nowrap px-4 text-center text-[17vw] font-normal leading-[0.8] tracking-tight text-slate-900 sm:px-6 lg:px-8 dark:text-white"
    >
      {'SERVICE GO'.split('').map((huruf, i) => (
        <span
          key={i}
          style={{ transitionDelay: `${i * 70}ms` }}
          className={clsx(
            'inline-block transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none',
            shown ? 'translate-y-0 opacity-100' : 'translate-y-[0.3em] opacity-0'
          )}
        >
          {huruf === ' ' ? ' ' : huruf}
        </span>
      ))}
    </p>
  );
}

/** Layar muat bermerek: logo ServiceGo + lingkaran berputar. */
function SplashScreen({ label }: { label?: string }) {
  return (
    <div
      role="status"
      aria-label={label ?? 'Memuat halaman'}
      className="relative flex min-h-screen flex-col items-center justify-center gap-7 overflow-hidden bg-slate-950"
    >
      {/* Cahaya oranye lembut di belakang logo supaya tidak datar. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(520px 320px at 50% 45%, rgba(249,115,22,0.16), transparent 70%)' }}
      />
      <img src="/logo-servicego-full.png?v=6" alt="" className="relative h-16 w-auto animate-pulse object-contain sm:h-20" />
      <div className="relative h-10 w-10 animate-spin rounded-full border-[3px] border-white/15 border-t-accent-500" />
      {label && <p className="relative text-sm text-slate-400">{label}</p>}
    </div>
  );
}

function Wordmark({ isTransparent = false }: { isTransparent?: boolean }) {
  return (
    <Link href="/" className="flex items-center rounded-chip shrink-0 group py-1" aria-label="ServiceGo, ke Beranda">
      <img
        src="/logo-servicego-full.png?v=6"
        alt="ServiceGo Logo"
        className="h-11 sm:h-14 w-auto object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-md"
      />
    </Link>
  );
}

export function CustomerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading, user } = useAuth();
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isPublicPage =
    isAuthPage || pathname === '/' || pathname.startsWith('/services/') || pathname.startsWith('/booking/');

  // Auth guard: hanya untuk halaman non-publik
  useEffect(() => {
    if (!loading && !session && !isPublicPage) {
      // Bawa halaman asal supaya setelah login kembali ke sini (misal link /bookings/<id> yang dibagikan).
      router.replace(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
  }, [loading, session, router, isPublicPage]);

  // Kontak footer diambil dari data bengkel asli (Supabase), bukan nomor karangan.
  const branchesQuery = useQuery<BranchContact[]>({
    queryKey: ['branches'],
    queryFn: () => fetcher('/branches'),
    enabled: !isAuthPage
  });

  // Live CS: hanya untuk yang sudah login. Dipasang di shell supaya balasan CS tetap
  // terdeteksi (badge) walau drawer tertutup.
  const supportChat = useCustomerSupportChat(session?.user.id ?? null);

  if (isAuthPage) {
    return <>{children}</>;
  }

  // Terlihat setiap kali halaman di-refresh, selama sesi masih diperiksa.
  if (loading) {
    return <SplashScreen />;
  }

  if (!isPublicPage && !session) {
    return <SplashScreen label="Mengarahkan ke halaman masuk..." />;
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  const onBookingFlow = pathname.startsWith('/booking/');
  // Header transparan + konten full-bleed hanya untuk landing tamu; dashboard pelanggan
  // butuh header biasa, kalau tidak judulnya tertimpa logo.
  const isHome = pathname === '/' && !session;

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-chip focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-700"
      >
        Lewati ke konten
      </a>

      <header
        className={clsx(
          'z-40 transition-colors',
          isHome
            ? 'absolute top-0 inset-x-0 bg-transparent border-none'
            : 'sticky top-0 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
        )}
      >
        <div className="relative mx-auto flex h-16 sm:h-20 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Wordmark isTransparent={isHome} />
            {session && (
              <nav aria-label="Navigasi utama" className="hidden md:flex items-center gap-1">
                {NAV.map(({ href, label }) => {
                  const active = isActive(pathname, href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      className={clsx(
                        'rounded-chip px-3 py-2 text-[15px] font-medium transition-colors',
                        isHome
                          ? active
                            ? 'text-white bg-white/20 font-semibold'
                            : 'text-white/80 hover:text-white hover:bg-white/10'
                          : active
                            ? 'text-primary-700 bg-primary-50 dark:text-primary-100 dark:bg-primary-900/50'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
                      )}
                    >
                      {label}
                    </Link>
                  );
                })}
              </nav>
            )}
            {!session && !loading && (
              <nav
                aria-label="Navigasi utama"
                className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2"
              >
                {[
                  { href: '/#harga', label: 'Harga' },
                  { href: '/#cara', label: 'Cara Kerja' },
                  { href: '/#lokasi', label: 'Lokasi' },
                  { href: '/#promo', label: 'Promo' }
                ].map(({ href, label }) => (
                  <a
                    key={href}
                    href={href}
                    className={clsx(
                      'rounded-chip px-3 py-2 text-[15px] font-medium transition-colors',
                      isHome
                        ? 'text-white/80 hover:text-white hover:bg-white/10'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
                    )}
                  >
                    {label}
                  </a>
                ))}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle className={isHome ? '!text-white hover:!bg-white/15' : ''} />
            <button
              type="button"
              onClick={() => setIsSupportOpen(true)}
              aria-label={
                supportChat.unreadFromAdmin > 0
                  ? `Tanya CS ServiceGo, ${supportChat.unreadFromAdmin} balasan baru`
                  : 'Tanya CS ServiceGo'
              }
              title="Tanya CS ServiceGo"
              className={clsx(
                'relative inline-flex h-11 w-11 items-center justify-center rounded-ctl transition-colors',
                isHome
                  ? 'text-white hover:bg-white/15'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
              )}
            >
              <Headphones className="h-5 w-5" aria-hidden />
              {supportChat.unreadFromAdmin > 0 && (
                <span className="absolute right-1.5 top-1.5 min-w-[18px] rounded-full bg-red-600 px-1 text-center text-[11px] font-bold leading-[18px] text-white">
                  {supportChat.unreadFromAdmin > 9 ? '9+' : supportChat.unreadFromAdmin}
                </span>
              )}
            </button>
            {session && <NotificationPopover />}

            {!session && !loading && (
              <Link
                href="/login"
                className={clsx(
                  'hidden sm:inline-flex h-11 items-center rounded-ctl px-3 text-[15px] font-semibold transition-colors',
                  isHome
                    ? 'text-white hover:bg-white/15'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                )}
              >
                Masuk
              </Link>
            )}

            {!onBookingFlow && (
              <Link
                href="/booking/new"
                className="hidden sm:inline-flex h-11 items-center gap-2 rounded-ctl bg-accent-500 px-4 text-[15px] font-semibold text-slate-950 hover:bg-accent-600 transition-colors shadow-lg"
              >
                <CalendarPlus className="h-4 w-4" aria-hidden />
                Booking servis
              </Link>
            )}

            {session && (
              <button
                type="button"
                onClick={handleSignOut}
                aria-label="Keluar dari akun"
                title="Keluar"
                className={clsx(
                  'hidden md:inline-flex h-11 w-11 items-center justify-center rounded-ctl transition-colors',
                  isHome
                    ? 'text-white hover:bg-white/15'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                )}
              >
                <LogOut className="h-5 w-5" aria-hidden />
              </button>
            )}
          </div>
        </div>
      </header>

      <main
        id="konten"
        className={clsx(
          'w-full flex-1',
          isHome ? 'p-0' : 'mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8'
        )}
      >
        {children}
      </main>

      <footer className="bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-[1440px] px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.9fr_1fr_1fr_1.5fr] lg:gap-12">
            <div className="space-y-4">
              <Wordmark />
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Platform booking servis mobil dan motor di bengkel ServiceGo. Pilih layanan yang kamu butuhkan,
                ambil jadwal yang masih kosong, dan lihat estimasi biayanya sebelum berangkat. Status pengerjaan
                bisa dipantau langsung dari HP, dan seluruh riwayat servis kendaraanmu tersimpan rapi di satu akun.
              </p>
            </div>

            <div>
              <ul className="space-y-2 text-sm">
                {FOOTER_EXPLORE.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-slate-600 transition-colors hover:text-accent-600 dark:text-slate-400 dark:hover:text-accent-500"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <ul className="space-y-2 text-sm">
                {(session
                  ? [
                      { href: '/bookings', label: 'Riwayat booking' },
                      { href: '/notifications', label: 'Notifikasi' },
                      { href: '/profile', label: 'Profil saya' }
                    ]
                  : [
                      { href: '/login', label: 'Masuk' },
                      { href: '/register', label: 'Daftar akun' }
                    ]
                ).map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-slate-600 transition-colors hover:text-accent-600 dark:text-slate-400 dark:hover:text-accent-500"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              {branchesQuery.isLoading && <p className="text-sm text-slate-500">Memuat kontak bengkel...</p>}
              {branchesQuery.isError && (
                <p className="text-sm text-slate-600 dark:text-slate-400">Kontak bengkel belum bisa dimuat.</p>
              )}
              {branchesQuery.data && branchesQuery.data.length === 0 && (
                <p className="text-sm text-slate-600 dark:text-slate-400">Belum ada bengkel terdaftar.</p>
              )}
              {branchesQuery.data && branchesQuery.data.length === 1 && (
                <div className="space-y-2.5 text-sm">
                  {branchesQuery.data[0].address && (
                    <p className="flex gap-2 text-slate-600 dark:text-slate-400">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                      {branchesQuery.data[0].address}
                    </p>
                  )}
                  <a
                    href={`tel:${branchesQuery.data[0].phone.replace(/[^0-9+]/g, '')}`}
                    className="flex items-center gap-2 text-slate-600 transition-colors hover:text-accent-600 dark:text-slate-400 dark:hover:text-accent-500"
                  >
                    <Phone className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                    <span className="sr-only">Telepon </span>
                    <span className="font-mono text-[13px]">{branchesQuery.data[0].phone}</span>
                  </a>
                </div>
              )}
              {branchesQuery.data && branchesQuery.data.length > 1 && (
                <ul className="space-y-2">
                  {branchesQuery.data.map((b) => (
                    <li key={b.id} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-slate-700 dark:text-slate-300 truncate">{shortBranchName(b.name)}</span>
                      <a
                        href={`tel:${b.phone.replace(/[^0-9+]/g, '')}`}
                        className="font-mono text-[13px] text-slate-900 hover:text-accent-600 dark:text-slate-100 dark:hover:text-accent-500 whitespace-nowrap"
                      >
                        {b.phone}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2.5 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Clock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                Buka setiap hari {FOOTER_JAM}
              </p>
            </div>
          </div>

          {/* Hanya dirender saat ada isinya, supaya tidak menyisakan garis kosong. */}
          {session && user?.email && (
            <p className="mt-10 truncate border-t border-slate-200 pt-6 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
              Masuk sebagai {user.email}
            </p>
          )}
        </div>

        <GiantWordmark />
      </footer>

      {/* Navigasi bawah untuk mobile */}
      <nav
        aria-label="Navigasi utama"
        className="md:hidden sticky bottom-0 z-40 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mx-auto grid h-16 max-w-lg grid-cols-5">
          {[NAV[0], NAV[1]].map(({ href, label, icon: Icon }) => (
            <MobileNavItem key={href} href={href} label={label} Icon={Icon} active={isActive(pathname, href)} />
          ))}
          <Link
            href="/booking/new"
            aria-current={onBookingFlow ? 'page' : undefined}
            className="flex flex-col items-center justify-center gap-0.5 text-xs font-semibold text-slate-900 dark:text-white"
          >
            <span className="flex h-9 w-11 items-center justify-center rounded-ctl bg-accent-500 text-slate-950">
              <CalendarPlus className="h-5 w-5" aria-hidden />
            </span>
            Booking
          </Link>
          {[NAV[2], NAV[3]].map(({ href, label, icon: Icon }) => (
            <MobileNavItem key={href} href={href} label={label} Icon={Icon} active={isActive(pathname, href)} />
          ))}
        </div>
      </nav>

      <SupportChatDrawer
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        userEmail={user?.email}
        chat={session ? supportChat : null}
        loginHref={`/login?redirect=${encodeURIComponent(pathname)}`}
      />
    </div>
  );
}

function MobileNavItem({
  href,
  label,
  Icon,
  active
}: {
  href: string;
  label: string;
  Icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        'flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
        active ? 'text-primary-700 dark:text-primary-100' : 'text-slate-600 dark:text-slate-400'
      )}
    >
      <Icon className={clsx('h-5 w-5', active && 'stroke-[2.25]')} aria-hidden />
      {label}
    </Link>
  );
}
