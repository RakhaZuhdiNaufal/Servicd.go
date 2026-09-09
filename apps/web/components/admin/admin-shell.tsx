'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Calendar, Users, Car, Wrench, Menu, X,
  Bell, LogOut, ChevronDown, Search
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase-client';
import { useQuery } from '@tanstack/react-query';
import { fetcher } from '@/lib/fetcher';
import { CommandPalette } from '@/components/admin/command-palette';

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/bookings', label: 'Booking', icon: Calendar },
  { href: '/admin/customers', label: 'Pelanggan', icon: Users },
  { href: '/admin/vehicles', label: 'Kendaraan', icon: Car },
  { href: '/admin/services', label: 'Layanan', icon: Wrench }
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const isAuthPage = pathname === '/admin/login';

  // Auth guard
  useEffect(() => {
    if (!loading && !session && !isAuthPage) router.replace('/admin/login');
  }, [loading, session, router, isAuthPage]);

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (loading) return null;
  if (!session) return null;

  // Notifications badge count
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetcher<{ data: any[] }>('/notifications').catch(() => null),
    enabled: !!session,
    refetchInterval: 30_000
  });
  const unreadCount = Array.isArray(notifData)
    ? notifData.filter((n: any) => !n.is_read).length
    : 0;

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (loading) return null;
  if (!session) return null;

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/admin/login');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-base)]">
      {/* Sidebar */}
      <aside
        className={clsx(
          'flex flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-all duration-200',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Logo */}
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-3 px-4 py-5 border-b border-slate-200 dark:border-slate-700"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-600 text-white font-bold text-sm shrink-0">
            SG
          </div>
          {!collapsed && (
            <span className="font-bold text-primary-900 dark:text-white text-sm">ServiceGo</span>
          )}
        </Link>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={clsx(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" strokeWidth={1.75} />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center justify-center p-4 border-t border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </button>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
          {/* Search trigger */}
          <button
            onClick={() => setCmdOpen(true)}
            className="flex items-center gap-2 rounded-md border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors min-w-[200px]"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Cari booking…</span>
            <kbd className="ml-auto text-xs bg-slate-100 dark:bg-slate-700 rounded px-1.5 py-0.5 font-mono">
              ⌘K
            </kbd>
          </button>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <Link
              href="/notifications"
              className="relative p-2 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Notifikasi"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-medium">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* Avatar dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
                <div className="h-7 w-7 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center font-semibold">
                  A
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
              <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-md z-50 py-1">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <LogOut className="h-4 w-4" />
                  Keluar
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>

      {/* Command Palette */}
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
