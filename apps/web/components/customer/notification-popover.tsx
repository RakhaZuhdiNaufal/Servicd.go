'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import { fetcher } from '@/lib/fetcher';
import { formatNotificationTime } from '@/lib/format';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationsResponse {
  unread_count: number;
  notifications: AppNotification[];
}

/** Lonceng notifikasi. Data asli dari /api/v1/notifications (tabel notifications di Supabase). */
export function NotificationPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery<NotificationsResponse>({
    queryKey: ['notifications'],
    queryFn: () => fetcher('/notifications')
  });

  const markAll = useMutation({
    mutationFn: () => fetcher('/notifications', { method: 'PATCH' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Semua notifikasi ditandai sudah dibaca');
    },
    onError: (e: Error) => toast.error(e.message)
  });

  useEffect(() => {
    if (!isOpen) return;
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  const unread = data?.unread_count ?? 0;
  const items = data?.notifications ?? [];

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={unread > 0 ? `Notifikasi, ${unread} belum dibaca` : 'Notifikasi'}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-ctl text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 min-w-[18px] rounded-full bg-red-600 px-1 text-center text-[11px] font-bold leading-[18px] text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifikasi"
          className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-ctl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <p className="font-semibold text-slate-900 dark:text-white">Notifikasi</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                className="min-h-[36px] rounded-chip px-2 text-sm font-medium text-primary-700 hover:bg-primary-50 disabled:opacity-60 dark:text-primary-100 dark:hover:bg-slate-800"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {isLoading && (
              <div className="space-y-3 p-4" aria-busy>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-2/3 rounded shimmer" />
                    <div className="h-3 w-full rounded shimmer" />
                  </div>
                ))}
              </div>
            )}

            {isError && (
              <div className="space-y-2 p-4 text-sm">
                <p className="text-slate-700 dark:text-slate-300">Notifikasi belum bisa dimuat.</p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="min-h-[36px] font-semibold text-primary-700 hover:underline dark:text-primary-100"
                >
                  Coba lagi
                </button>
              </div>
            )}

            {!isLoading && !isError && items.length === 0 && (
              <p className="p-6 text-center text-sm text-slate-600 dark:text-slate-400">
                Belum ada notifikasi. Kabar soal booking kamu akan muncul di sini.
              </p>
            )}

            {items.length > 0 && (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.slice(0, 8).map((n) => (
                  <li key={n.id} className={clsx('px-4 py-3', !n.is_read && 'bg-primary-50/60 dark:bg-primary-900/20')}>
                    <div className="flex items-start gap-2">
                      {!n.is_read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-600" aria-label="Belum dibaca" />
                      )}
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{n.title}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{n.body}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          <time dateTime={n.created_at}>{formatNotificationTime(n.created_at, { todayLabel: 'Hari ini' })}</time>
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-slate-200 px-4 py-2 dark:border-slate-800">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="flex min-h-[40px] items-center text-sm font-semibold text-primary-700 hover:underline dark:text-primary-100"
            >
              Lihat semua notifikasi
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
