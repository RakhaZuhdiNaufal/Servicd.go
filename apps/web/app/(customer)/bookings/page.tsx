'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetcher } from '@/lib/fetcher';
import { StatusBadge } from '@/components/status-badge';
import { SkeletonCard } from '@/components/skeletons';
import Link from 'next/link';
import { clsx } from 'clsx';
import { ChevronRight } from 'lucide-react';

type FilterStatus = 'semua' | 'menunggu' | 'diproses' | 'selesai' | 'dibatalkan';

interface Booking {
  id: string;
  status: 'menunggu' | 'diproses' | 'selesai' | 'dibatalkan';
  scheduled_at: string;
  estimated_cost: number;
  vehicle: { plate_number: string; brand: string; model: string };
  booking_services: Array<{ service: { name: string } }>;
}

const FILTERS: { label: string; value: FilterStatus }[] = [
  { label: 'Semua', value: 'semua' },
  { label: 'Menunggu', value: 'menunggu' },
  { label: 'Diproses', value: 'diproses' },
  { label: 'Selesai', value: 'selesai' },
  { label: 'Dibatalkan', value: 'dibatalkan' }
];

const formatRp = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

export default function BookingsPage() {
  const [filter, setFilter] = useState<FilterStatus>('semua');

  const { data: allBookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ['bookings'],
    queryFn: () => fetcher('/bookings')
  });

  const bookings = filter === 'semua' ? allBookings : allBookings.filter((b) => b.status === filter);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">Riwayat Booking</h1>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={clsx(
              'shrink-0 rounded-full px-3 py-1 text-sm font-medium transition border',
              filter === value
                ? 'bg-primary-600 border-primary-600 text-white'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-400'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Booking list */}
      {isLoading ? (
        <SkeletonCard count={4} />
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-slate-400">
            {filter === 'semua' ? 'Belum ada riwayat booking' : `Tidak ada booking dengan status "${filter}"`}
          </p>
          {filter === 'semua' && (
            <Link href="/booking/new" className="text-sm text-accent-500 font-semibold hover:underline">
              Buat Booking Pertama →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <Link
              key={b.id}
              href={`/bookings/${b.id}`}
              className="flex items-center gap-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4 hover:border-primary-300 hover:shadow-sm transition group"
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-data font-bold text-sm text-slate-800 dark:text-slate-200">
                    {b.vehicle.plate_number}
                  </p>
                  <StatusBadge status={b.status} size="sm" />
                </div>
                <p className="text-xs text-slate-500">
                  {b.vehicle.brand} {b.vehicle.model}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {b.booking_services.map((s) => s.service.name).join(', ')}
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    {new Date(b.scheduled_at).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </span>
                  <span className="font-data font-semibold text-primary-700">{formatRp(b.estimated_cost)}</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary-500 shrink-0 transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
