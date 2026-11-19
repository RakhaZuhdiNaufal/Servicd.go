'use client';

import { useMemo, useState } from 'react';
import { Car, Clock, Cog, Disc3, Droplets, Snowflake, Sparkles, Wrench, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { formatDuration, formatRp } from '@/lib/format';
import { EmptyState, ErrorState } from '@/components/customer/states';
import { Service } from './types';
import { ServiceSkeleton } from './booking-skeletons';
import { StepSection, optionClass, SelectIndicator } from './booking-stepper';

/** Kelompok layanan, ditebak dari nama/deskripsi layanan (tidak ada kolom kategori di database). */
export const SERVICE_CATEGORIES = [
  { id: 'mesin', label: 'Mesin' },
  { id: 'oli', label: 'Oli & cairan' },
  { id: 'rem', label: 'Rem' },
  { id: 'kelistrikan', label: 'Kelistrikan' },
  { id: 'ac', label: 'AC' },
  { id: 'kaca-film', label: 'Kaca & detailing' },
  { id: 'kaki-kaki', label: 'Kaki-kaki' }
] as const;

export type ServiceCategoryId = (typeof SERVICE_CATEGORIES)[number]['id'];

/** Ikon per kategori, dipakai sebagai "gambar" di kartu layanan (landing & dashboard). */
export const CATEGORY_ICONS: Record<ServiceCategoryId, typeof Cog> = {
  mesin: Cog,
  oli: Droplets,
  rem: Disc3,
  kelistrikan: Zap,
  ac: Snowflake,
  'kaca-film': Sparkles,
  'kaki-kaki': Car
};

export function getServiceCategory(name: string, description?: string | null): ServiceCategoryId {
  const text = ` ${name} ${description || ''} `.toLowerCase();
  const has = (...words: string[]) => words.some((w) => text.includes(w));

  if (has('kaca film', 'jamur kaca', 'detailing', 'poles')) return 'kaca-film';
  if (has(' ac ', 'freon', 'filter kabin', 'evaporator')) return 'ac';
  if (has('spooring', 'kaki-kaki', 'shockbreaker', 'balancing')) return 'kaki-kaki';
  if (has('oli', 'radiator', 'coolant', 'gardan', 'transmisi')) return 'oli';
  if (has(' rem', 'rotor', 'kaliper', 'kampas', 'kanvas')) return 'rem';
  if (has('kelistrikan', ' aki', 'starter', 'alternator', 'lampu', 'obd2')) return 'kelistrikan';
  return 'mesin';
}

interface ServiceSelectorProps {
  services: Service[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  selectedServices: string[];
  onToggleService: (id: string) => void;
  active: boolean;
  done: boolean;
}

type Filter = 'all' | ServiceCategoryId;

export function ServiceSelector({
  services,
  isLoading,
  isError,
  onRetry,
  selectedServices,
  onToggleService,
  active,
  done
}: ServiceSelectorProps) {
  const [filter, setFilter] = useState<Filter>('all');

  const activeServices = useMemo(() => services.filter((s) => s.is_active), [services]);

  // Hanya kategori yang benar-benar punya layanan yang ditampilkan sebagai chip.
  const { categories, counts } = useMemo(() => {
    const counts = new Map<Filter, number>([['all', activeServices.length]]);
    activeServices.forEach((s) => {
      const c = getServiceCategory(s.name, s.description);
      counts.set(c, (counts.get(c) ?? 0) + 1);
    });
    return { categories: SERVICE_CATEGORIES.filter((c) => counts.has(c.id)), counts };
  }, [activeServices]);

  const displayed =
    filter === 'all'
      ? activeServices
      : activeServices.filter((s) => getServiceCategory(s.name, s.description) === filter);

  const chips: Array<{ id: Filter; label: string }> = [{ id: 'all', label: 'Semua' }, ...categories];

  return (
    <StepSection
      stepKey="layanan"
      number={2}
      title="Mau servis apa?"
      description="Boleh pilih lebih dari satu. Harga di sini estimasi awal."
      active={active}
      done={done}
      aside={
        selectedServices.length > 0 ? (
          <span className="text-[15px] font-bold text-primary-700 dark:text-primary-100">
            {selectedServices.length} dipilih
          </span>
        ) : undefined
      }
    >
      {isLoading ? (
        <ServiceSkeleton count={4} />
      ) : isError ? (
        <ErrorState title="Daftar layanan belum bisa dimuat" onRetry={onRetry} />
      ) : activeServices.length === 0 ? (
        <EmptyState icon={Wrench} title="Belum ada layanan yang dibuka" description="Coba cek lagi nanti." />
      ) : (
        <div className="space-y-4">
          {categories.length > 1 && (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Saring kategori layanan">
              {chips.map((c) => {
                const on = filter === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setFilter(c.id)}
                    className={clsx(
                      'inline-flex min-h-[44px] shrink-0 items-center rounded-chip border px-4 text-[15px] font-semibold transition-colors',
                      on
                        ? 'border-primary-600 bg-primary-600 text-white'
                        : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800'
                    )}
                  >
                    {c.label}
                    <span className={clsx('ml-1.5 text-sm', on ? 'text-primary-100' : 'text-slate-500 dark:text-slate-400')}>
                      {counts.get(c.id)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {displayed.map((s) => {
              const checked = selectedServices.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => onToggleService(s.id)}
                  className={optionClass(checked)}
                >
                  <SelectIndicator selected={checked} shape="square" />
                  <span className="flex min-w-0 flex-1 flex-col gap-2">
                    <span className="text-[15px] font-semibold leading-snug text-slate-900 dark:text-white">{s.name}</span>
                    {s.description && (
                      <span className="line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                        {s.description}
                      </span>
                    )}
                    <span className="mt-auto flex items-center justify-between gap-2 pt-1 text-[13px]">
                      <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
                        <Clock className="h-3.5 w-3.5" aria-hidden />
                        {formatDuration(s.duration_minutes)}
                      </span>
                      <span className="text-[17px] font-bold text-slate-900 dark:text-white">{formatRp(s.price)}</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </StepSection>
  );
}
