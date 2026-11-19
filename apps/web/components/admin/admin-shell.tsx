'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Menu,
  X,
  Bell,
  LogOut,
  ChevronDown,
  Search,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase-client';
import { ThemeToggle } from '@/components/theme-toggle';
import { CommandPalette } from '@/components/admin/command-palette';
import { useSupportUnread } from '@/components/admin/use-support-unread';
import { ADMIN_NAV } from '@/components/admin/nav';

const COLLAPSE_KEY = 'sg-admin-sidebar';

const iconBtn =
  'relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-ctl text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors';

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/');
}

/**
 * Logo resmi ServiceGo. Versi lengkap (emblem + tulisan) saat sidebar terbuka; saat diciutkan
 * dipakai emblem sayapnya saja supaya tetap terbaca di lebar 72px.
 */
function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/admin/dashboard"
      className="flex min-h-[44px] items-center gap-2.5 rounded-chip"
      aria-label="ServiceGo Admin, ke Dashboard"
    >
      <img
        src={compact ? '/logo-servicego-wings.png' : '/logo-servicego-transparent.png'}
        alt=""
        className={clsx('w-auto shrink-0 object-contain', compact ? 'h-6' : 'h-9')}
      />
      {!compact && (
        <span className="whitespace-nowrap border-l border-slate-200 pl-2.5 text-[13px] font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Admin
        </span>
      )}
    </Link>
  );
}

function NavList({
  pathname,
  collapsed,
  unread,
  onNavigate
}: {
  pathname: string;
  collapsed: boolean;
  unread: number;
  onNavigate?: () => void;
}) {
  return (
    <ul className="space-y-0.5">
      {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        const badge = href === '/admin/support' && unread > 0 ? unread : 0;
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              aria-label={badge ? `${label}, ${badge} chat belum dibalas` : collapsed ? label : undefined}
              title={collapsed ? label : undefined}
              className={clsx(
                'relative flex min-h-[44px] items-center gap-3 rounded-chip text-[14px] font-medium transition-colors',
                collapsed ? 'justify-center' : 'px-3',
                active
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-100'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
              {!collapsed && <span className="flex-1 truncate">{label}</span>}
              {badge > 0 &&
                (collapsed ? (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-600" aria-hidden />
                ) : (
                  <span className="min-w-[22px] rounded-full bg-red-600 px-1.5 text-center text-[12px] font-bold leading-[20px] text-white" aria-hidden>
                    {badge > 99 ? '99+' : badge}
                  </span>
                ))}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Menu akun: dibuka dengan klik, Enter/Spasi, atau panah bawah; ditutup Escape atau klik di luar. */
function AccountMenu({ email, name, onLogout }: { email: string; name: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const itemRef = useRef<HTMLButtonElement>(null);
  const initials =
    name
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || 'A';

  useEffect(() => {
    if (!open) return;
    itemRef.current?.focus();
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    function onFocus(e: FocusEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    document.addEventListener('focusin', onFocus);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('focusin', onFocus);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? 'admin-account-menu' : undefined}
        aria-label={`Menu akun ${email}`}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="flex h-11 items-center gap-1.5 rounded-ctl pl-1.5 pr-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors sm:pr-2"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-[13px] font-semibold text-white" aria-hidden>
          {initials}
        </span>
        <ChevronDown className="hidden h-4 w-4 sm:block" aria-hidden />
      </button>
      {open && (
        <div
          id="admin-account-menu"
          role="menu"
          aria-label="Akun admin"
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-ctl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="px-3 py-2" role="none">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{name}</p>
            <p className="truncate text-[13px] text-slate-600 dark:text-slate-400">{email}</p>
          </div>
          <div className="my-1 h-px bg-slate-200 dark:bg-slate-700" role="none" />
          <button
            ref={itemRef}
            type="button"
            role="menuitem"
            onClick={onLogout}
            className="flex min-h-[44px] w-full items-center gap-2.5 rounded-chip px-3 text-left text-sm font-medium text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/50 transition-colors"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Keluar
          </button>
        </div>
      )}
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, user, role, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const drawerRef = useRef<HTMLDialogElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const isAuthPage = pathname === '/admin/login';

  // Auth guard
  useEffect(() => {
    if (!loading && !session && !isAuthPage) router.replace('/admin/login');
  }, [loading, session, router, isAuthPage]);

  // Status ciut sidebar diingat per perangkat
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
    } catch {
      // localStorage bisa diblokir; pakai default (terbuka)
    }
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
    } catch {
      // abaikan
    }
  }

  // Badge lonceng: percakapan Live Support yang belum dibalas admin
  const unreadQuery = useSupportUnread(!!session && !isAuthPage && role !== 'customer');
  const unread = unreadQuery.data ?? 0;

  // Ctrl+K / Cmd+K membuka pencarian
  useEffect(() => {
    if (isAuthPage) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isAuthPage]);

  const closeDrawer = useCallback(() => {
    const d = drawerRef.current;
    if (d?.open) d.close();
  }, []);

  // Tutup drawer mobile saat pindah halaman
  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (loading || !session) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 dark:bg-slate-950" role="status">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {loading ? 'Memeriksa sesi admin...' : 'Mengarahkan ke halaman masuk admin...'}
          </p>
        </div>
      </div>
    );
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/admin/login');
  }

  const email = user?.email ?? '';
  const name = (user?.user_metadata?.full_name as string | undefined) || email.split('@')[0] || 'Admin';

  // Pelanggan yang membuka /admin: API admin pasti menolak (middleware RBAC), jadi beri jalan keluar yang jelas.
  if (role === 'customer') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Akun ini bukan akun admin</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Kamu masuk sebagai {email}. Panel admin hanya untuk staf bengkel.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={logout}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-ctl bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
            >
              Keluar dan ganti akun
            </button>
            <Link
              href="/"
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-ctl border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Ke portal pelanggan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50 dark:bg-slate-950">
      <a
        href="#admin-konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[60] focus:rounded-chip focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-700"
      >
        Lewati ke konten
      </a>

      {/* Sidebar desktop (bisa diciutkan) */}
      <aside
        className={clsx(
          'hidden shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex',
          collapsed ? 'w-[72px]' : 'w-60'
        )}
      >
        <div className={clsx('flex h-14 items-center border-b border-slate-200 dark:border-slate-800', collapsed ? 'justify-center' : 'px-4')}>
          <Wordmark compact={collapsed} />
        </div>
        <nav aria-label="Menu admin" className={clsx('flex-1 overflow-y-auto py-3', collapsed ? 'px-3' : 'px-3')}>
          <NavList pathname={pathname} collapsed={collapsed} unread={unread} />
        </nav>
        <div className={clsx('border-t border-slate-200 p-3 dark:border-slate-800', collapsed && 'flex justify-center')}>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Lebarkan sidebar' : 'Ciutkan sidebar'}
            title={collapsed ? 'Lebarkan sidebar' : 'Ciutkan sidebar'}
            className={clsx(
              'flex min-h-[44px] items-center gap-3 rounded-chip text-[14px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors',
              collapsed ? 'w-11 justify-center' : 'w-full px-3'
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-[18px] w-[18px]" aria-hidden />
            ) : (
              <>
                <PanelLeftClose className="h-[18px] w-[18px]" aria-hidden />
                Ciutkan menu
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Drawer mobile: <dialog> native, tertutup dengan Escape, tombol X, atau klik latar */}
      <dialog
        ref={drawerRef}
        aria-label="Navigasi admin"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeDrawer();
        }}
        onClose={() => menuBtnRef.current?.focus()}
        className="m-0 h-dvh max-h-none w-72 max-w-[85vw] border-r border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/50 dark:border-slate-800 dark:bg-slate-900 dark:text-white lg:hidden"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center justify-between border-b border-slate-200 pl-4 pr-2 dark:border-slate-800">
            <Wordmark />
            <button type="button" onClick={closeDrawer} aria-label="Tutup menu" className={iconBtn}>
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <nav aria-label="Menu admin" className="flex-1 overflow-y-auto p-3">
            <NavList pathname={pathname} collapsed={false} unread={unread} onNavigate={closeDrawer} />
          </nav>
          <div className="border-t border-slate-200 p-3 dark:border-slate-800">
            <p className="truncate px-3 pb-2 text-[13px] text-slate-600 dark:text-slate-400">{email}</p>
            <button
              type="button"
              onClick={logout}
              className="flex min-h-[44px] w-full items-center gap-2.5 rounded-chip px-3 text-sm font-medium text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/50 transition-colors"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Keluar
            </button>
          </div>
        </div>
      </dialog>

      {/* Area utama */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-2 dark:border-slate-800 dark:bg-slate-900 sm:px-4 lg:px-6">
          <button
            ref={menuBtnRef}
            type="button"
            onClick={() => drawerRef.current?.showModal()}
            aria-label="Buka menu navigasi"
            className={clsx(iconBtn, 'lg:hidden')}
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>

          <button
            type="button"
            onClick={() => setCmdOpen(true)}
            aria-label="Cari booking atau halaman (Ctrl+K)"
            aria-keyshortcuts="Control+K Meta+K"
            className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-ctl border border-slate-200 bg-slate-50 px-3 text-left text-sm text-slate-600 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-900 transition-colors sm:max-w-sm"
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">Cari pelanggan atau plat</span>
            <kbd className="ml-auto hidden shrink-0 rounded-plate border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 sm:inline">
              Ctrl K
            </kbd>
          </button>

          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
            <ThemeToggle />
            <Link
              href="/admin/support"
              aria-label={unread > 0 ? `${unread} chat pelanggan belum dibalas, buka Live Support` : 'Live Support, tidak ada chat yang menunggu'}
              title={unread > 0 ? `${unread} chat belum dibalas` : 'Tidak ada chat yang menunggu'}
              className={iconBtn}
            >
              <Bell className="h-5 w-5" aria-hidden />
              {unread > 0 && (
                <span className="absolute right-1 top-1.5 min-w-[18px] rounded-full bg-red-600 px-1 text-center text-[11px] font-bold leading-[18px] text-white" aria-hidden>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>
            <AccountMenu email={email} name={name} onLogout={logout} />
          </div>
        </header>

        <main id="admin-konten" className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
