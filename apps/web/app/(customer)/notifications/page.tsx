'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetcher } from '@/lib/fetcher';
import { SkeletonCard } from '@/components/skeletons';
import { Bell, CheckCheck, Info, Calendar, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { clsx } from 'clsx';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationsResponse {
  unread_count: number;
  notifications: NotificationItem[];
}

export default function NotificationsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<NotificationsResponse>({
    queryKey: ['notifications'],
    queryFn: () => fetcher('/notifications')
  });

  const markAllMutation = useMutation({
    mutationFn: () =>
      fetcher('/notifications', {
        method: 'PATCH'
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Semua notifikasi ditandai sebagai dibaca');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menandai notifikasi');
    }
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unread_count ?? 0;

  function getIcon(type: string) {
    switch (type) {
      case 'booking':
        return <Calendar className="h-5 w-5 text-primary-500" />;
      case 'alert':
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Notifikasi</h1>
          {unreadCount > 0 && (
            <p className="text-xs text-primary-600 font-medium mt-0.5">
              {unreadCount} pesan belum dibaca
            </p>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-primary-600 font-medium py-1.5 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />
            <span>Tandai Dibaca</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <SkeletonCard count={3} />
      ) : notifications.length === 0 ? (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Bell className="h-6 w-6" />
          </div>
          <p className="font-semibold text-slate-700 dark:text-slate-300">Belum Ada Notifikasi</p>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Notifikasi terkait jadwal booking, status perbaikan, dan pengingat servis akan muncul di sini.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={clsx(
                'rounded-lg border p-4 transition flex gap-3.5',
                n.is_read
                  ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                  : 'border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-950/20'
              )}
            >
              <div className="shrink-0 mt-0.5">{getIcon(n.type)}</div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className={clsx(
                      'text-sm font-semibold leading-tight',
                      n.is_read
                        ? 'text-slate-800 dark:text-slate-200'
                        : 'text-primary-900 dark:text-primary-100'
                    )}
                  >
                    {n.title}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-data shrink-0">
                    {new Date(n.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {n.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
