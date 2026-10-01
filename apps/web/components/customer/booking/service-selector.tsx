'use client';

import { useState, useEffect } from 'react';
import {
  Clock,
  LayoutGrid,
  Wrench,
  Droplets,
  Disc,
  Zap,
  Snowflake,
  Sun,
  Compass
} from 'lucide-react';
import { clsx } from 'clsx';
import { Checkbox } from '@/components/ui/checkbox';
import { Service } from './types';
import { ServiceSkeleton } from './booking-skeletons';

export const SERVICE_CATEGORIES = [
  { id: 'mesin', label: 'Mesin Dalam', icon: Wrench },
  { id: 'oli', label: 'Oli & Cairan', icon: Droplets },
  { id: 'rem', label: 'Sistem Rem', icon: Disc },
  { id: 'kelistrikan', label: 'Kelistrikan', icon: Zap },
  { id: 'ac', label: 'AC Mobil', icon: Snowflake },
  { id: 'kaca-film', label: 'Kaca Film', icon: Sun },
  { id: 'kaki-kaki', label: 'Kaki-kaki', icon: Compass },
  { id: 'all', label: 'Semua Layanan', icon: LayoutGrid }
] as const;

export type ServiceCategoryId = (typeof SERVICE_CATEGORIES)[number]['id'];

export function getServiceCategory(name: string, description?: string | null): ServiceCategoryId {
  const text = `${name} ${description || ''}`.toLowerCase();

  if (
    text.includes('kaca film') ||
    text.includes('jamur kaca') ||
    text.includes('detailing') ||
    text.includes('poles')
  ) {
    return 'kaca-film';
  }
  if (
    text.includes('ac ') ||
    text.includes('freon') ||
    text.includes('filter kabin') ||
    text.includes('evaporator')
  ) {
    return 'ac';
  }
  if (
    text.includes('spooring') ||
    text.includes('kaki-kaki') ||
    text.includes('shockbreaker') ||
    text.includes('balancing')
  ) {
    return 'kaki-kaki';
  }
  if (
    text.includes('oli') ||
    text.includes('radiator') ||
    text.includes('coolant') ||
    text.includes('gardan') ||
    text.includes('transmisi')
  ) {
    return 'oli';
  }
  if (
    text.includes('rem') ||
    text.includes('rotor') ||
    text.includes('kaliper') ||
    text.includes('kampas rem') ||
    text.includes('kanvas rem')
  ) {
    return 'rem';
  }
  if (
    text.includes('kelistrikan') ||
    text.includes(' aki') ||
    text.includes('/ aki') ||
    text.includes('starter') ||
    text.includes('alternator') ||
    text.includes('lampu') ||
    text.includes('obd2')
  ) {
    return 'kelistrikan';
  }

  return 'mesin';
}

interface ServiceSelectorProps {
  services: Service[];
  isLoading: boolean;
  selectedServices: string[];
  onToggleService: (id: string) => void;
}

const formatRp = (v: number | string) => {
  const num = typeof v === 'string' ? parseFloat(v) : v;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number.isFinite(num) ? num : 0);
};

export function ServiceSelector({
  services,
  isLoading,
  selectedServices,
  onToggleService
}: ServiceSelectorProps) {
  // Default to 'mesin' so the cards don't flood the entire page downwards
  const [activeCategory, setActiveCategory] = useState<ServiceCategoryId>('mesin');

  const activeServices = services.filter((s) => s.is_active);

  // If a pre-selected service is present on initial load, auto-focus its category
  useEffect(() => {
    if (selectedServices.length > 0 && services.length > 0) {
      const firstSelected = services.find((s) => s.id === selectedServices[0]);
      if (firstSelected) {
        const cat = getServiceCategory(firstSelected.name, firstSelected.description);
        setActiveCategory(cat);
      }
    }
  }, [services, selectedServices.length]);

  const displayedServices =
    activeCategory === 'all'
      ? activeServices
      : activeServices.filter((s) => getServiceCategory(s.name, s.description) === activeCategory);

  return (
    <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-primary-600 flex items-center justify-center font-bold text-sm">
            2
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Pilih Layanan Servis</h2>
            <p className="text-xs text-slate-500">Bisa memilih lebih dari satu layanan yang dibutuhkan</p>
          </div>
        </div>
        <span className="text-xs font-semibold text-primary-600 bg-primary-50 dark:bg-primary-950 px-2.5 py-1 rounded-full">
          {selectedServices.length} Dipilih
        </span>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* UI Pemilihan Kelompok: Buletan kecil dengan gambar icon kategori    */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Kategori Servis
          </span>
          <span className="text-xs text-slate-400 font-medium">
            {displayedServices.length} Layanan Ditampilkan
          </span>
        </div>

        {/* Baris buletan ikon kategori */}
        <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto pb-1 pt-1 no-scrollbar -mx-1 px-1">
          {SERVICE_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;

            // Hitung berapa layanan yang sedang dipilih dalam kategori ini
            const selectedInCategoryCount = activeServices.filter(
              (s) =>
                selectedServices.includes(s.id) &&
                (cat.id === 'all' || getServiceCategory(s.name, s.description) === cat.id)
            ).length;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className="flex flex-col items-center gap-1.5 group shrink-0 focus:outline-none transition"
              >
                {/* Buletan kecil dengan gambar ikon kategori */}
                <div
                  className={clsx(
                    'h-12 w-12 rounded-full border-2 flex items-center justify-center transition-all duration-200 relative shadow-sm',
                    isActive
                      ? 'bg-primary-600 border-primary-600 text-white shadow-md shadow-primary-600/25 ring-4 ring-primary-500/20 scale-105'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 group-hover:border-primary-400 group-hover:text-primary-600 group-hover:bg-primary-50/30'
                  )}
                >
                  <Icon
                    className={clsx(
                      'h-5 w-5 transition-transform duration-200 group-hover:scale-110',
                      isActive ? 'stroke-[2.5]' : 'stroke-2'
                    )}
                  />

                  {/* Badge penanda jumlah layanan yang dipilih di kategori ini */}
                  {selectedInCategoryCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-orange-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-sm">
                      {selectedInCategoryCount}
                    </span>
                  )}
                </div>

                {/* Nama Kategori */}
                <span
                  className={clsx(
                    'text-[11px] font-semibold whitespace-nowrap transition-colors duration-150',
                    isActive
                      ? 'text-primary-600 dark:text-primary-400 font-bold'
                      : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'
                  )}
                >
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid Layanan Servis (Hanya menampilkan kategori yang dipilih, 2-3 baris rapi) */}
      {isLoading ? (
        <ServiceSkeleton count={4} />
      ) : activeServices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-slate-400 text-sm">
          Tidak ada layanan aktif saat ini
        </div>
      ) : displayedServices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-slate-400 text-sm">
          Tidak ada layanan dalam kategori ini
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {displayedServices.map((s) => {
            const isChecked = selectedServices.includes(s.id);

            return (
              <div
                key={s.id}
                onClick={() => onToggleService(s.id)}
                className={clsx(
                  'rounded-xl border p-4 flex flex-col justify-between gap-3 cursor-pointer transition duration-150 min-h-[120px]',
                  isChecked
                    ? 'border-primary-500 bg-primary-50/40 dark:bg-primary-950/30 ring-2 ring-primary-500/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-primary-300 bg-white dark:bg-slate-900'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => onToggleService(s.id)}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {s.name}
                    </h3>
                    {s.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                        {s.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <div className="flex items-center gap-1 text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{s.duration_minutes} menit</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-primary-600 dark:text-primary-400">
                    {formatRp(s.price)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
