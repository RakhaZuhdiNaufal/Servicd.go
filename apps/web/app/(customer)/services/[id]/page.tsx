'use client';

import { useQuery } from '@tanstack/react-query';
import { fetcher } from '@/lib/fetcher';
import Link from 'next/link';
import { use } from 'react';
import { Clock, ArrowLeft, ChevronRight } from 'lucide-react';
import { SkeletonText } from '@/components/skeletons';

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  is_active: boolean;
}

const formatRp = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

export default function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  // Reuse the public services list, find the one we need client-side
  // ponytail: no separate endpoint needed — filter the cached list
  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: () => fetcher('/services')
  });

  const service = services.find((s) => s.id === id);

  if (isLoading) {
    return (
      <div className="space-y-4 pt-4">
        <div className="h-6 w-1/3 shimmer rounded" />
        <SkeletonText lines={4} />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="text-center py-16 space-y-2">
        <p className="text-slate-500">Layanan tidak ditemukan</p>
        <Link href="/" className="text-primary-600 text-sm hover:underline">
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary-600 transition">
        <ArrowLeft className="h-4 w-4" />
        Kembali
      </Link>

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header band */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-8">
          <h1 className="text-2xl font-bold text-white">{service.name}</h1>
          <div className="flex items-center gap-3 mt-2 text-primary-100">
            <span className="font-data font-bold text-xl">{formatRp(service.price)}</span>
            <span>·</span>
            <span className="flex items-center gap-1 text-sm">
              <Clock className="h-4 w-4" />
              {service.duration_minutes} menit
            </span>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {service.description && (
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Tentang Layanan</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{service.description}</p>
            </div>
          )}

          {!service.is_active && (
            <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950 p-3 text-sm text-amber-700 dark:text-amber-300">
              Layanan ini saat ini tidak tersedia.
            </div>
          )}

          <Link
            href={`/booking/new?service=${service.id}`}
            className={`flex items-center justify-center gap-2 w-full rounded-md font-semibold py-3 text-sm transition ${
              service.is_active
                ? 'bg-accent-500 hover:bg-accent-600 text-white'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed pointer-events-none'
            }`}
          >
            Booking Layanan Ini
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
