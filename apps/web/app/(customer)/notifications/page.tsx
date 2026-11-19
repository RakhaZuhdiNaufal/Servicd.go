'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Loader2, Mail, MessageCircle, Smartphone } from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import { fetcher } from '@/lib/fetcher';
import { formatNotificationTime, isTodayWIB } from '@/lib/format';
import { EmptyState, ErrorState, SkeletonBlock } from '@/components/customer/states';

/** Bentuk data dari GET /api/v1/notifications (tabel notifications di Supabase). */
interface AppNotification {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  sent_channel?: 'push' | 'whatsapp' | 'email';
  created_at: string;
}

interface NotificationsResponse {
  unread_count: number;
  notifications: AppNotification[];
}

const CHANNEL: Record<NonNullable<AppNotification['sent_channel']>, { label: string; icon: React.ElementType }> = {
  push: { label: 'Notifikasi aplikasi', icon: Smartphone },
  whatsapp: { label: 'Juga dikirim lewat WhatsApp', icon: MessageCircle },
  email: { label: 'Juga dikirim lewat email', icon: Mail }
};

/**
 * Tips perawatan umum (edukasi statis milik pemilik, bukan berita atau klaim).
 * Sengaja tanpa angka interval: interval yang benar ada di buku manual tiap kendaraan.
 */
const CARE_TIPS: Array<{ title: string; body: string }> = [
  {
    title: 'Cek oli mesin',
    body: 'Tarik dipstick saat mesin dingin dan kendaraan di tempat datar. Kalau level di bawah tanda MIN atau oli sudah hitam pekat, saatnya ganti.'
  },
  {
    title: 'Tekanan ban',
    body: 'Cek saat ban masih dingin. Ikuti angka tekanan di stiker pintu pengemudi atau buku manual, bukan angka maksimal di dinding ban.'
  },
  {
    title: 'Minyak rem',
    body: 'Pedal rem terasa empuk atau makin dalam? Lihat level dan warna minyak rem di tabung reservoir, lalu minta bengkel memeriksanya.'
  },
  {
    title: 'Aki',
    body: 'Mesin berat saat distarter atau lampu meredup bisa jadi tanda aki melemah. Pastikan terminal aki bersih dari kerak dan kencang.'
  },
  {
    title: 'Jadwal servis berkala',
    body: 'Ikuti interval di buku servis kendaraan kamu, dan catat angka odometer setiap kali servis supaya jadwal berikutnya mudah dihitung.'
  }
];

type Filter = 'semua' | 'belum';

// "Hari ini" dihitung menurut kalender WIB, sama dengan jam yang ditampilkan.
function isToday(iso: string) {
  return isTodayWIB(iso);
}

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('semua');

  const { data, isLoading, isError, error, refetch } = useQuery<NotificationsResponse>({
    queryKey: ['notifications'],
    queryFn: () => fetcher('/notifications')
  });

  const markAll = useMutation({
    mutationFn: () => fetcher('/notifications', { method: 'PATCH' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Semua notifikasi ditandai sudah dibaca');
    },
    onError: (e: Error) => toast.error(e.message || 'Gagal menandai notifikasi')
  });

  const all = data?.notifications ?? [];
  const unread = data?.unread_count ?? all.filter((n) => !n.is_read).length;
  const items = filter === 'belum' ? all.filter((n) => !n.is_read) : all;
  // Dikelompokkan supaya kabar hari ini terlihat terpisah dari yang lama.
  const groups = [
    { label: 'Hari ini', list: items.filter((n) => isToday(n.created_at)) },
    { label: 'Sebelumnya', list: items.filter((n) => !isToday(n.created_at)) }
  ].filter((g) => g.list.length > 0);

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-col gap-5 pt-2 sm:flex-row sm:items-end sm:justify-between sm:pt-4">
        <div className="max-w-2xl space-y-2">
          <h1 className="text-[30px] sm:text-[38px] font-bold leading-[1.1] tracking-[-0.015em] text-slate-900 dark:text-white">
            Notifikasi
          </h1>
          <p className="text-[17px] leading-relaxed text-slate-600 dark:text-slate-400">
            {unread > 0
              ? `Ada ${unread} kabar yang belum kamu baca soal booking dan servis kendaraan.`
              : 'Kabar soal booking dan servis kendaraan kamu, plus tips perawatan singkat.'}
          </p>
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-ctl border border-slate-300 bg-white px-4 text-[15px] font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800 transition-colors"
          >
            {markAll.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <CheckCheck className="h-4 w-4" aria-hidden />
            )}
            Tandai semua dibaca
          </button>
        )}
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:items-start lg:gap-8">
        {/* Fokus halaman: notifikasi pribadi dari API */}
        <section aria-labelledby="notif-heading" className="space-y-5">
          <h2 id="notif-heading" className="sr-only">
            Notifikasi kamu
          </h2>

          <div role="group" aria-label="Saring notifikasi" className="flex flex-wrap gap-2">
            {(
              [
                { key: 'semua', label: 'Semua' },
                { key: 'belum', label: unread > 0 ? `Belum dibaca (${unread})` : 'Belum dibaca' }
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
                className={clsx(
                  'min-h-[44px] rounded-chip border px-4 text-[15px] font-semibold transition-colors',
                  filter === f.key
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {isLoading && (
            <div
              className="space-y-5 rounded-[20px] border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
              aria-busy
              aria-label="Memuat notifikasi"
            >
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3.5">
                  <SkeletonBlock className="h-11 w-11 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <SkeletonBlock className="h-4 w-1/2" />
                    <SkeletonBlock className="h-3 w-full" />
                    <SkeletonBlock className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {isError && (
            <ErrorState
              title="Notifikasi belum bisa dimuat"
              message={(error as Error)?.message}
              onRetry={() => refetch()}
            />
          )}

          {!isLoading && !isError && items.length === 0 && (
            <EmptyState
              icon={Bell}
              title={filter === 'belum' ? 'Semua notifikasi sudah dibaca' : 'Belum ada notifikasi'}
              description={
                filter === 'belum'
                  ? 'Tidak ada kabar baru yang belum kamu baca.'
                  : 'Konfirmasi booking dan perubahan status servis akan muncul di sini.'
              }
              action={
                filter === 'belum'
                  ? { label: 'Lihat semua notifikasi', onClick: () => setFilter('semua') }
                  : { label: 'Lihat riwayat booking', href: '/bookings' }
              }
            />
          )}

          {!isLoading &&
            !isError &&
            groups.map((g) => (
              <div key={g.label} className="space-y-2.5">
                <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">{g.label}</h3>
                <ul className="divide-y divide-slate-200 overflow-hidden rounded-[20px] border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                  {g.list.map((n) => {
                    const channel = n.sent_channel ? CHANNEL[n.sent_channel] : null;
                    const ChannelIcon = channel?.icon;
                    return (
                      <li
                        key={n.id}
                        className={clsx(
                          'relative flex gap-3.5 px-5 py-5 sm:px-6',
                          !n.is_read && 'bg-primary-50/70 dark:bg-primary-900/20'
                        )}
                      >
                        {!n.is_read && <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-primary-600" />}
                        <span
                          className={clsx(
                            'flex h-11 w-11 shrink-0 items-center justify-center rounded-ctl',
                            n.is_read
                              ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                              : 'bg-primary-600 text-white'
                          )}
                        >
                          <Bell className="h-5 w-5" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                            <p className="break-words text-[16px] font-bold text-slate-900 dark:text-white">
                              {!n.is_read && <span className="sr-only">Belum dibaca: </span>}
                              {n.title}
                            </p>
                            <time dateTime={n.created_at} className="text-[13px] text-slate-600 dark:text-slate-400">
                              {formatNotificationTime(n.created_at)}
                            </time>
                          </div>
                          <p className="break-words text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
                            {n.body}
                          </p>
                          {channel && ChannelIcon && n.sent_channel !== 'push' && (
                            <p className="flex items-center gap-1.5 text-[13px] text-slate-600 dark:text-slate-400">
                              <ChannelIcon className="h-3.5 w-3.5" aria-hidden />
                              {channel.label}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
        </section>

        {/* Tips perawatan: konten edukasi statis, panel gelap sebagai jeda ritme halaman */}
        <aside
          aria-labelledby="tips-heading"
          className="rounded-[20px] bg-slate-900 p-6 text-white sm:p-8 lg:sticky lg:top-24 dark:bg-slate-950 dark:ring-1 dark:ring-slate-800"
        >
          <div className="space-y-1.5">
            <h2 id="tips-heading" className="text-[24px] font-bold leading-[1.15] tracking-[-0.015em]">
              Tips perawatan
            </h2>
            <p className="text-[15px] text-slate-300">Hal kecil yang bisa kamu cek sendiri di rumah.</p>
          </div>
          <ol className="mt-6 space-y-5">
            {CARE_TIPS.map((tip, i) => (
              <li key={tip.title} className="space-y-1 border-t-2 border-primary-500 pt-3">
                <h3 className="flex items-baseline gap-2.5 text-[16px] font-bold">
                  <span aria-hidden className="font-mono text-sm font-semibold text-blue-300">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {tip.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-300">{tip.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-7 space-y-3 border-t border-slate-700 pt-6">
            <p className="text-[15px] text-slate-300">Ada yang terasa janggal di kendaraan kamu?</p>
            <Link
              href="/booking/new"
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-ctl border border-slate-600 px-4 text-[15px] font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              Booking pemeriksaan
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
