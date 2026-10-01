'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Home, Calendar, Bell, User, Wrench, LogIn, LogOut,
  Car, Clock, ArrowRight, Phone, Mail, ShieldCheck, Globe, Newspaper, Headphones,
  X, Sparkles
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase-client';
import { SupportChatDrawer } from './support-chat-drawer';
import { NotificationPopover } from './notification-popover';

const NAV = [
  { href: '/', label: 'Beranda', icon: Home },
  { href: '/booking/new', label: 'Booking', icon: Calendar },
  { href: '/bookings', label: 'Riwayat', icon: Clock },
  { href: '/notifications', label: 'Berita', icon: Newspaper },
  { href: '/profile', label: 'Profil', icon: User }
];

export function CustomerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading, user } = useAuth();
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [showSupportNudge, setShowSupportNudge] = useState(false);
  const [dismissedNudge, setDismissedNudge] = useState(false);

  // Proactive CS Nudge Rhythm (3.5s -> stays 6s -> pause 14s -> stays 5s)
  useEffect(() => {
    if (dismissedNudge || isSupportOpen) {
      setShowSupportNudge(false);
      return;
    }

    // Ritme 1: Muncul setelah 3.5 detik awal
    const timer1 = setTimeout(() => {
      setShowSupportNudge(true);
    }, 3500);

    // Tetap tampil selama 6 detik lalu menutup halus
    const timer2 = setTimeout(() => {
      setShowSupportNudge(false);
    }, 9500);

    // Ritme 2: Pengingat santai setelah jeda 14 detik
    const timer3 = setTimeout(() => {
      setShowSupportNudge(true);
    }, 23500);

    // Menghilang lagi setelah 5 detik
    const timer4 = setTimeout(() => {
      setShowSupportNudge(false);
    }, 28500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [dismissedNudge, isSupportOpen]);

  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isPublicPage =
    isAuthPage ||
    pathname === '/' ||
    pathname.startsWith('/services/') ||
    pathname.startsWith('/booking');

  // Auth guard: only guard non-public pages
  useEffect(() => {
    if (!loading && !session && !isPublicPage) {
      router.replace('/login');
    }
  }, [loading, session, router, isPublicPage]);

  // Auth pages (login/register) render directly without the shell layout
  if (isAuthPage) {
    return <>{children}</>;
  }

  // Non-public pages while unauthenticated or loading show a graceful loading placeholder
  if (!isPublicPage && (loading || !session)) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          <p className="text-xs text-slate-500 font-medium">Mengarahkan ke halaman masuk...</p>
        </div>
      </div>
    );
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col selection:bg-primary-500 selection:text-white">
      {/* Top nav */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center text-white shadow-sm shadow-primary-500/20 group-hover:bg-primary-700 transition">
              <Wrench className="h-4 w-4 transform group-hover:rotate-12 transition-transform duration-200" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white text-base tracking-tight">
              Service<span className="text-primary-600">Go</span>
            </span>
          </Link>

          {/* Nav links (desktop) */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = href === '/'
                ? pathname === '/'
                : pathname === href || (href !== '/profile' && pathname.startsWith(href));

              return (
                <Link
                  key={label}
                  href={href}
                  className={clsx(
                    'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition duration-150',
                    active
                      ? 'text-primary-600 bg-primary-50 dark:bg-primary-950/80 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* User actions */}
          <div className="flex items-center gap-3 shrink-0">
            {/* CTA Booking Button */}
            <Link
              href="/booking/new"
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-sm font-semibold px-4 py-2 shadow-sm shadow-orange-500/25 transition transform active:scale-95"
            >
              <span>Booking Sekarang</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            {/* Customer Support CS Icon (with Proactive Nudge Rhythm) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsSupportOpen(true);
                  setShowSupportNudge(false);
                }}
                className="relative h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-400 dark:hover:border-primary-500 transition shadow-2xs group"
                title="Bantuan & Live Chat CS"
                aria-label="Bantuan & Live Chat CS"
              >
                <Headphones className="h-4 w-4 transition-transform group-hover:scale-110" />
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white dark:border-slate-900"></span>
                </span>
              </button>

              {/* Proactive Nudge Balloon (Smart Rhythm & Theme-Aligned Slate Styling) */}
              {showSupportNudge && !isSupportOpen && (
                <div
                  onClick={() => {
                    setIsSupportOpen(true);
                    setShowSupportNudge(false);
                  }}
                  className="absolute top-full -right-2 sm:-right-4 mt-2.5 w-60 sm:w-64 z-40 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl border border-slate-300/90 dark:border-slate-700 shadow-xl p-3.5 cursor-pointer hover:border-primary-400 dark:hover:border-primary-500 transition-all duration-300 animate-in fade-in slide-in-from-top-2 group/nudge select-none"
                >
                  {/* Upward pointer arrow aligned with CS button */}
                  <div className="absolute -top-1.5 right-5 sm:right-6 w-3 h-3 bg-slate-100 dark:bg-slate-800 border-t border-l border-slate-300/90 dark:border-slate-700 rotate-45" />

                  <div className="relative z-10 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/90 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 tracking-wider">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        CS ONLINE
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowSupportNudge(false);
                          setDismissedNudge(true);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition"
                        title="Tutup notifikasi"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>

                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                      Silakan cek pertanyaan jika ada seputar servis kendaraan 👋
                    </p>

                    <div className="pt-1.5 flex items-center justify-between text-[11px] text-primary-600 dark:text-primary-400 font-bold group-hover/nudge:text-primary-700 dark:group-hover/nudge:text-primary-300 transition-colors border-t border-slate-200/90 dark:border-slate-700/80">
                      <span>Mulai Tanya CS Sekarang</span>
                      <span className="group-hover/nudge:translate-x-0.5 transition-transform">→</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notification Bell Popover (Replaces redundant Logout Icon) */}
            <NotificationPopover />

            {!session && (
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 hover:text-primary-600 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Masuk</span>
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-3.5 py-1.5 shadow-sm shadow-primary-600/20 transition"
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content area */}
      <main className={clsx(
        'flex-1 w-full',
        pathname === '/' || pathname.startsWith('/booking') || pathname === '/profile' || pathname === '/notifications'
          ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4'
          : 'max-w-4xl mx-auto px-4 sm:px-6 py-4'
      )}>
        {children}
      </main>

      {/* Bottom nav for Mobile screens */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-40">
        <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={label}
                href={href}
                className={clsx(
                  'flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition',
                  active ? 'text-primary-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
                )}
              >
                <Icon className={clsx('h-5 w-5', active && 'stroke-[2.5]')} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      {/* Spacer for mobile bottom nav */}
      <div className="h-16 md:hidden" />

      {/* ── Footer ── */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Col 1: Brand & Slogan */}
            <div className="lg:col-span-2 space-y-4">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center text-white shadow-sm shadow-primary-500/20">
                  <Wrench className="h-4 w-4" />
                </div>
                <span className="font-bold text-slate-900 dark:text-white text-base">
                  Service<span className="text-primary-600">Go</span>
                </span>
              </Link>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                Solusi servis kendaraan terpadu untuk perjalanan yang lebih aman dan nyaman. Booking bengkel transparan, cepat, dan bergaransi.
              </p>
              <div className="flex items-center gap-3 text-slate-400 pt-1">
                <a href="#" aria-label="Instagram" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary-600 transition">
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                <a href="#" aria-label="Facebook" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary-600 transition">
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="#" aria-label="YouTube" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary-600 transition">
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </a>
                <a href="#" aria-label="Website" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary-600 transition">
                  <Globe className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Col 2: Produk */}
            <div>
              <p className="font-semibold text-slate-900 dark:text-white text-sm mb-3.5">Produk</p>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="/" className="hover:text-primary-600 transition">Beranda</Link></li>
                <li><Link href="/booking/new" className="hover:text-primary-600 transition">Booking Servis</Link></li>
                <li><Link href="/bookings" className="hover:text-primary-600 transition">Riwayat Booking</Link></li>
                <li><Link href="/notifications" className="hover:text-primary-600 transition">Berita & Edukasi</Link></li>
                <li><Link href="/profile" className="hover:text-primary-600 transition">Profil Saya</Link></li>
              </ul>
            </div>

            {/* Col 3: Bantuan & Informasi */}
            <div>
              <p className="font-semibold text-slate-900 dark:text-white text-sm mb-3.5">Bantuan</p>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#" className="hover:text-primary-600 transition">Pusat Bantuan</a></li>
                <li><a href="#" className="hover:text-primary-600 transition">Cara Booking</a></li>
                <li><a href="#" className="hover:text-primary-600 transition">Metode Pembayaran</a></li>
                <li><a href="#" className="hover:text-primary-600 transition">Syarat & Ketentuan</a></li>
                <li><a href="#" className="hover:text-primary-600 transition">Kebijakan Privasi</a></li>
              </ul>
            </div>

            {/* Col 4: Hubungi Kami */}
            <div>
              <p className="font-semibold text-slate-900 dark:text-white text-sm mb-3.5">Hubungi Kami</p>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary-600 shrink-0" />
                  <span>0800 1234 5678</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary-600 shrink-0" />
                  <span>cs@servicego.id</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-slate-400">
                  <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>Senin - Minggu, 07:00 - 22:00 WIB</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© 2026 ServiceGo. Semua hak dilindungi.</p>
            <div className="flex items-center gap-2 text-slate-400">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <span>Melayani lebih dari 10.000+ kendaraan di seluruh Indonesia</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Customer Support Live Chat Drawer */}
      <SupportChatDrawer
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        userEmail={user?.email}
      />
    </div>
  );
}
