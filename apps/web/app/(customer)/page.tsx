'use client';

import { useQuery } from '@tanstack/react-query';
import { fetcher } from '@/lib/fetcher';
import { useAuth } from '@/lib/auth-context';
import { SkeletonCard } from '@/components/skeletons';
import Link from 'next/link';
import { Car, Plus, Clock, ChevronRight } from 'lucide-react';

interface Vehicle {
  id: string;
  plate_number: string;
  brand: string;
  model: string;
  vehicle_type: string;
}

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

export default function BerandaPage() {
  const { user } = useAuth();
  const name = user?.user_metadata?.full_name ?? 'Pelanggan';

  const { data: vehicles = [], isLoading: vLoading } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => fetcher('/vehicles')
  });

  const { data: services = [], isLoading: sLoading } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: () => fetcher('/services')
  });

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="pt-2">
        <p className="text-sm text-slate-500 dark:text-slate-400">Halo, 👋</p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{name}</h1>
      </div>

      {/* CTA Banner */}
      <div className="rounded-lg bg-gradient-to-r from-primary-600 to-primary-700 text-white p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-primary-100">Kendaraanmu butuh perhatian?</p>
          <p className="text-lg font-bold mt-0.5">Booking Servis Sekarang</p>
        </div>
        <Link
          href="/booking/new"
          className="shrink-0 rounded-md bg-accent-500 hover:bg-accent-600 text-white font-semibold px-4 py-2.5 text-sm transition"
        >
          Booking →
        </Link>
      </div>

      {/* Vehicles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 dark:text-slate-200">Kendaraan Saya</h2>
          <Link href="/profile" className="text-xs text-primary-600 font-medium hover:underline">
            Kelola
          </Link>
        </div>

        {vLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[1, 2].map((i) => (
              <div key={i} className="shrink-0 w-44 h-24 rounded-lg shimmer" />
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {vehicles.map((v) => (
              <Link
                key={v.id}
                href="/profile"
                className="shrink-0 w-44 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 space-y-1 hover:border-primary-400 transition"
              >
                <div className="flex items-center gap-1.5 text-primary-600">
                  <Car className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase">{v.vehicle_type}</span>
                </div>
                <p className="font-data font-bold text-slate-800 dark:text-slate-200 text-sm">{v.plate_number}</p>
                <p className="text-xs text-slate-500">{v.brand} {v.model}</p>
              </Link>
            ))}
            <Link
              href="/profile"
              className="shrink-0 w-44 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-primary-400 hover:text-primary-500 transition"
            >
              <Plus className="h-5 w-5" />
              <span className="text-xs font-medium">Tambah Kendaraan</span>
            </Link>
          </div>
        )}
      </div>

      {/* Services Grid */}
      <div className="space-y-3">
        <h2 className="font-semibold text-slate-800 dark:text-slate-200">Layanan Kami</h2>
        {sLoading ? (
          <SkeletonCard count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {services.filter((s) => s.is_active).map((s) => (
              <Link
                key={s.id}
                href={`/services/${s.id}`}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 space-y-1 hover:border-primary-400 hover:shadow-sm transition group"
              >
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight group-hover:text-primary-700">
                  {s.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-data font-semibold text-primary-600">{formatRp(s.price)}</span>
                  <span>·</span>
                  <Clock className="h-3 w-3" />
                  <span>{s.duration_minutes} mnt</span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{s.description}</p>
                <p className="text-xs text-primary-600 font-medium flex items-center gap-0.5">
                  Lihat detail <ChevronRight className="h-3 w-3" />
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
