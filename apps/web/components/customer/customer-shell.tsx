'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Home, Clock, Newspaper, User, Wrench, Headphones, CalendarPlus, LogOut } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase-client';
import { fetcher } from '@/lib/fetcher';
import { shortBranchName } from '@/lib/format';
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

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2 rounded-chip shrink-0" aria-label="ServiceGo, ke Beranda">
      <span className="flex h-8 w-8 items-center justify-center rounded-chip bg-primary-600 text-white">
        <Wrench className="h-4 w-4" aria-hidden />
      </span>
      <span className="text-[17px] font-bold tracking-tight text-slate-900 dark:text-white">
        Service<span className="text-primary-600 dark:text-primary-500">Go</span>
      </span>
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

  if (!isPublicPage && (loading || !session)) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center" role="status">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Mengarahkan ke halaman masuk...</p>
        </div>
      </div>
    );
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  const onBookingFlow = pathname.startsWith('/booking/');

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-chip focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-700"
      >
        Lewati ke konten
      </a>

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Wordmark />
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
                        active
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
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setIsSupportOpen(true)}
              aria-label={
                supportChat.unreadFromAdmin > 0
                  ? `Tanya CS ServiceGo, ${supportChat.unreadFromAdmin} balasan baru`
                  : 'Tanya CS ServiceGo'
              }
              title="Tanya CS ServiceGo"
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-ctl text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
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
                className="hidden sm:inline-flex h-11 items-center rounded-ctl px-3 text-[15px] font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                Masuk
              </Link>
            )}

            {!onBookingFlow && (
              <Link
                href="/booking/new"
                className="hidden sm:inline-flex h-11 items-center gap-2 rounded-ctl bg-accent-500 px-4 text-[15px] font-semibold text-slate-950 hover:bg-accent-600 transition-colors"
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
                className="hidden md:inline-flex h-11 w-11 items-center justify-center rounded-ctl text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
              >
                <LogOut className="h-5 w-5" aria-hidden />
              </button>
            )}
          </div>
        </div>
      </header>

      <main id="konten" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>

      <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-8 lg:flex-row lg:justify-between">
            <div className="max-w-sm space-y-3">
              <Wordmark />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Booking servis mobil dan motor di bengkel ServiceGo, lalu pantau pengerjaannya dari HP.
              </p>
              <button
                type="button"
                onClick={() => setIsSupportOpen(true)}
                className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-primary-700 hover:underline dark:text-primary-100"
              >
                <Headphones className="h-4 w-4" aria-hidden />
                Tanya CS lewat chat
              </button>
            </div>

            <div className="flex-1 lg:max-w-2xl">
              <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Hubungi bengkel</p>
              {branchesQuery.isLoading && <p className="text-sm text-slate-500">Memuat kontak bengkel...</p>}
              {branchesQuery.isError && (
                <p className="text-sm text-slate-600 dark:text-slate-400">Kontak bengkel belum bisa dimuat.</p>
              )}
              {branchesQuery.data && branchesQuery.data.length === 0 && (
                <p className="text-sm text-slate-600 dark:text-slate-400">Belum ada bengkel terdaftar.</p>
              )}
              {branchesQuery.data && branchesQuery.data.length === 1 && (
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-slate-900 dark:text-white">{branchesQuery.data[0].name}</p>
                  {branchesQuery.data[0].address && (
                    <p className="text-slate-600 dark:text-slate-400">{branchesQuery.data[0].address}</p>
                  )}
                  <a
                    href={`tel:${branchesQuery.data[0].phone.replace(/[^0-9+]/g, '')}`}
                    className="inline-flex min-h-[44px] items-center font-mono text-[13px] font-semibold text-slate-900 hover:text-primary-700 dark:text-slate-100 dark:hover:text-primary-100"
                  >
                    <span className="sr-only">Telepon </span>
                    {branchesQuery.data[0].phone}
                  </a>
                </div>
              )}
              {branchesQuery.data && branchesQuery.data.length > 1 && (
                <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {branchesQuery.data.map((b) => (
                    <li key={b.id} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-slate-700 dark:text-slate-300 truncate">{shortBranchName(b.name)}</span>
                      <a
                        href={`tel:${b.phone.replace(/[^0-9+]/g, '')}`}
                        className="font-mono text-[13px] text-slate-900 hover:text-primary-700 dark:text-slate-100 dark:hover:text-primary-100 whitespace-nowrap"
                      >
                        {b.phone}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-2 border-t border-slate-200 pt-6 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:justify-between">
            <p>© {new Date().getFullYear()} ServiceGo</p>
            {session && user?.email && <p className="truncate">Masuk sebagai {user.email}</p>}
          </div>
        </div>
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
