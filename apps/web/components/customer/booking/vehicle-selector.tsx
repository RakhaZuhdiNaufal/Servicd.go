'use client';

import Link from 'next/link';
import { Car, Bike, Plus, ChevronRight, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { Vehicle } from './types';
import { VehicleSkeleton } from './booking-skeletons';

interface VehicleSelectorProps {
  vehicles: Vehicle[];
  isLoading: boolean;
  selectedVehicle: string;
  onSelectVehicle: (id: string) => void;
}

export function VehicleSelector({
  vehicles,
  isLoading,
  selectedVehicle,
  onSelectVehicle
}: VehicleSelectorProps) {
  const getVehicleIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t === 'motor' || t === 'motorcycle' || t === 'sepeda motor') {
      return Bike;
    }
    return Car;
  };

  return (
    <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-primary-600 flex items-center justify-center font-bold text-sm">
            1
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Pilih Kendaraan</h2>
            <p className="text-xs text-slate-500">Pilih kendaraan terdaftar yang akan diservis</p>
          </div>
        </div>
        <Link
          href="/profile"
          className="text-xs text-primary-600 font-semibold hover:underline flex items-center gap-1"
        >
          <span>Kelola</span>
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <VehicleSkeleton count={2} />
      ) : vehicles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
            <Car className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Belum ada kendaraan terdaftar
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Tambahkan kendaraan Anda terlebih dahulu sebelum melakukan booking servis.
            </p>
          </div>
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Kendaraan</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {vehicles.map((v) => {
            const isSelected = selectedVehicle === v.id;
            const Icon = getVehicleIcon(v.vehicle_type);

            return (
              <div
                key={v.id}
                onClick={() => onSelectVehicle(v.id)}
                className={clsx(
                  'rounded-xl border p-4 flex flex-col justify-between gap-3 cursor-pointer transition duration-150 relative min-h-[124px]',
                  isSelected
                    ? 'border-primary-500 bg-primary-50/40 dark:bg-primary-950/30 ring-2 ring-primary-500/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-primary-300 bg-white dark:bg-slate-900'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-primary-600 shrink-0">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div
                    className={clsx(
                      'h-5 w-5 rounded-full flex items-center justify-center shrink-0 transition',
                      isSelected
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'border-2 border-slate-300 dark:border-slate-600'
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug truncate capitalize">
                    {v.brand} {v.model}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {v.plate_number}
                    </span>
                    <span className="text-[11px] text-slate-400 capitalize">
                      {v.year ? `${v.year} · ` : ''}{v.vehicle_type}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* + Tambah Kendaraan Card */}
          <Link
            href="/profile"
            className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-primary-400 p-4 flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:text-primary-600 transition min-h-[124px]"
          >
            <Plus className="h-5 w-5" />
            <span className="text-xs font-semibold">+ Tambah Kendaraan</span>
          </Link>
        </div>
      )}
    </section>
  );
}
