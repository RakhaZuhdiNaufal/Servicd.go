'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Home, Calendar, Bell, User, Wrench } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '@/lib/auth-context';

const NAV = [
  { href: '/', label: 'Beranda', icon: Home },
  { href: '/bookings', label: 'Booking', icon: Calendar },
  { href: '/notifications', label: 'Notifikasi', icon: Bell },
  { href: '/profile', label: 'Profil', icon: User }
];

export function CustomerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading } = useAuth();
  const isAuthPage = pathname === '/login' || pathname === '/register';

  useEffect(() => {
    if (!loading && !session && !isAuthPage) router.replace('/login');
  }, [loading, session, router, isAuthPage]);

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (loading) return null;
  if (!session) return null;

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col">
      {/* Top nav */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary-600 flex items-center justify-center">
              <Wrench className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-primary-900 dark:text-white text-sm">ServiceGo</span>
          </Link>

          {/* Nav links (desktop) */}
          <nav className="hidden sm:flex items-center gap-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== '/' && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition',
                    active
                      ? 'text-primary-600 bg-primary-50 dark:bg-primary-950'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* CTA */}
          <Link
            href="/booking/new"
            className="flex items-center gap-1.5 rounded-md bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold px-4 py-2 transition shadow-sm"
          >
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Booking Sekarang</span>
            <span className="sm:hidden">Booking</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 z-40">
        <div className="grid grid-cols-4 h-16">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition',
                  active ? 'text-primary-600' : 'text-slate-400'
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
      {/* Spacer for bottom nav on mobile */}
      <div className="h-16 sm:hidden" />
    </div>
  );
}
