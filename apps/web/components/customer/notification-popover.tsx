'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCircle2,
  Wrench,
  Clock,
  Tag,
  AlertTriangle,
  CheckCheck,
  ChevronRight,
  Sparkles,
  Inbox,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

export interface AppNotification {
  id: string;
  type: 'booking_approved' | 'booking_completed' | 'booking_rejected' | 'reminder' | 'promo';
  title: string;
  body: string;
  is_read: boolean;
  timeAgo: string;
  href?: string;
  badgeLabel?: string;
}

const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    type: 'booking_approved',
    title: 'Booking Dikonfirmasi Bengkel! 🎉',
    body: 'Jadwal servis berkala & ganti oli Honda Brio Anda pada Rabu, 30 Sep 2026 pukul 09:00 WIB telah disetujui oleh ServiceGo Pusat.',
    is_read: false,
    timeAgo: '15 mnt lalu',
    href: '/bookings',
    badgeLabel: 'Disetujui'
  },
  {
    id: 'notif-2',
    type: 'booking_completed',
    title: 'Servis Selesai & Siap Diambil 🚗',
    body: 'Pengerjaan Servis Rem & Tune Up untuk Avanza (B 1234 XYZ) telah rampung diuji coba teknisi. Kendaraan siap diambil.',
    is_read: false,
    timeAgo: '2 jam lalu',
    href: '/bookings',
    badgeLabel: 'Selesai'
  },
  {
    id: 'notif-3',
    type: 'reminder',
    title: 'Pengingat Ganti Oli Mesin 🔔',
    body: 'Sudah mendekati 6 bulan sejak servis terakhir. Cek volume oli dan kondisi filter oli Anda untuk menjaga keawetan mesin.',
    is_read: true,
    timeAgo: '1 hari lalu',
    href: '/booking/new',
    badgeLabel: 'Pengingat'
  },
  {
    id: 'notif-4',
    type: 'promo',
    title: 'Voucher Diskon 20% Menanti Anda 🏷️',
    body: 'Klaim voucher SERVISHEMAT20 sebelum kuota bulan ini berakhir. Berlaku di seluruh bengkel rekanan resmi ServiceGo.',
    is_read: true,
    timeAgo: '3 hari lalu',
    href: '/booking/new',
    badgeLabel: 'Promo'
  }
];

export function NotificationPopover() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<AppNotification[]>(DEFAULT_NOTIFICATIONS);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const hasReadNotifications = notifications.some((n) => n.is_read);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Mark all as read
  function handleMarkAllAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast.success('Semua notifikasi ditandai sudah dibaca');

    // Sync to backend API if authenticated
    fetch('/api/v1/notifications', { method: 'PATCH' }).catch(() => null);
  }

  // Delete a single read notification
  function handleDeleteNotification(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    toast.success('Pesan telah dihapus');
  }

  // Delete all read notifications
  function handleDeleteAllRead() {
    setNotifications((prev) => prev.filter((n) => !n.is_read));
    toast.success('Semua pesan yang sudah dibaca telah dihapus');
  }

  // Handle click single notification
  function handleNotificationClick(notif: AppNotification) {
    // Mark as read locally
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
    );
    setIsOpen(false);

    if (notif.href) {
      router.push(notif.href);
    }
  }

  const displayedNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    return true;
  });

  return (
    <div ref={containerRef} className="relative">
      {/* Notification Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-400 dark:hover:border-primary-500 transition shadow-2xs group"
        title="Notifikasi & Status Booking"
        aria-label="Notifikasi & Status Booking"
        aria-expanded={isOpen}
      >
        <Bell className="h-4 w-4 transition-transform group-hover:rotate-12" />

        {/* Unread Red Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-600 text-white font-bold text-[10px] ring-2 ring-white dark:ring-slate-900 shadow-sm animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Pusat Notifikasi"
          className="absolute top-full right-0 mt-2.5 w-80 sm:w-96 z-50 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 select-none"
        >
          {/* Top Upward Pointer Arrow */}
          <div className="absolute -top-1.5 right-3.5 w-3 h-3 bg-white dark:bg-slate-900 border-t border-l border-slate-200/90 dark:border-slate-800 rotate-45" />

          {/* Header */}
          <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Notifikasi</h3>
              {unreadCount > 0 ? (
                <span className="px-2 py-0.2 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300">
                  {unreadCount} Baru
                </span>
              ) : (
                <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  Semua Dibaca
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="text-[11px] font-medium text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 transition px-1 py-0.5"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Tandai dibaca</span>
                </button>
              )}

              {hasReadNotifications && (
                <button
                  type="button"
                  onClick={handleDeleteAllRead}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                  title="Hapus semua pesan yang telah dibaca"
                  aria-label="Hapus semua pesan yang telah dibaca"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                filter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80'
              }`}
            >
              Semua ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition flex items-center gap-1 ${
                filter === 'unread'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80'
              }`}
            >
              <span>Belum Dibaca</span>
              {unreadCount > 0 && (
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              )}
            </button>
          </div>

          {/* Notification List Body */}
          <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {displayedNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Inbox className="h-8 w-8 text-slate-400 mx-auto stroke-1" />
                <p className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                  Tidak Ada Notifikasi
                </p>
                <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">
                  Semua notifikasi booking dan info servis Anda sudah dibaca.
                </p>
              </div>
            ) : (
              displayedNotifications.map((notif) => {
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                      !notif.is_read
                        ? 'bg-primary-50/40 dark:bg-primary-950/20'
                        : 'bg-transparent'
                    }`}
                  >
                    {/* Icon Type Badge */}
                    <div className="mt-0.5 shrink-0">
                      {notif.type === 'booking_approved' && (
                        <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400 flex items-center justify-center">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                      )}
                      {notif.type === 'booking_completed' && (
                        <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-950/80 dark:text-primary-400 flex items-center justify-center">
                          <Wrench className="h-4 w-4" />
                        </div>
                      )}
                      {notif.type === 'reminder' && (
                        <div className="h-8 w-8 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400 flex items-center justify-center">
                          <Clock className="h-4 w-4" />
                        </div>
                      )}
                      {notif.type === 'promo' && (
                        <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-950/80 dark:text-purple-400 flex items-center justify-center">
                          <Tag className="h-4 w-4" />
                        </div>
                      )}
                      {notif.type === 'booking_rejected' && (
                        <div className="h-8 w-8 rounded-full bg-red-100 text-red-600 dark:bg-red-950/80 dark:text-red-400 flex items-center justify-center">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {notif.title}
                          </h4>
                          {!notif.is_read && (
                            <span className="h-1.5 w-1.5 rounded-full bg-primary-600 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] text-slate-400">
                            {notif.timeAgo}
                          </span>
                          {notif.is_read && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNotification(notif.id);
                              }}
                              className="p-1 -mr-1 rounded-md text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                              title="Hapus pesan ini"
                              aria-label="Hapus pesan"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {notif.body}
                      </p>

                      <div className="pt-0.5 flex items-center justify-between">
                        {notif.badgeLabel && (
                          <span className="text-[10px] font-semibold px-2 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {notif.badgeLabel}
                          </span>
                        )}
                        <span className="text-[10px] font-medium text-primary-600 dark:text-primary-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                          <span>Lihat detail</span>
                          <ChevronRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Action */}
          <div className="p-2.5 bg-slate-50/80 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 text-center">
            <Link
              href="/bookings"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline block py-1"
            >
              Lihat Semua Riwayat Booking & Servis →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
