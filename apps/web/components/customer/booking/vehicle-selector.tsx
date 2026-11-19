'use client';

import Link from 'next/link';
import { Car, Bike, Plus, LogIn } from 'lucide-react';
import { Plate } from '@/components/customer/plate';
import { EmptyState, ErrorState } from '@/components/customer/states';
import { Vehicle } from './types';
import { VehicleSkeleton } from './booking-skeletons';
import { StepSection, optionClass, SelectIndicator } from './booking-stepper';

interface VehicleSelectorProps {
  isGuest: boolean;
  authLoading: boolean;
  loginHref: string;
  vehicles: Vehicle[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  selectedVehicle: string;
  onSelectVehicle: (id: string) => void;
  active: boolean;
  done: boolean;
}

export function isMotor(type: string) {
  const t = type.toLowerCase();
  return t === 'motor' || t === 'motorcycle' || t === 'sepeda motor';
}

export function VehicleSelector({
  isGuest,
  authLoading,
  loginHref,
  vehicles,
  isLoading,
  isError,
  onRetry,
  selectedVehicle,
  onSelectVehicle,
  active,
  done
}: VehicleSelectorProps) {
  const showManage = !isGuest && !authLoading && vehicles.length > 0;

  return (
    <StepSection
      stepKey="kendaraan"
      number={1}
      title="Kendaraan mana yang diservis?"
      description={isGuest ? 'Kendaraan diambil dari akun kamu.' : 'Pilih salah satu kendaraan di akun kamu.'}
      active={active}
      done={done}
      aside={
        showManage ? (
          <Link
            href="/profile"
            className="inline-flex min-h-[44px] items-center rounded-ctl px-2 text-sm font-semibold text-primary-700 hover:underline dark:text-primary-100"
          >
            Kelola
          </Link>
        ) : undefined
      }
    >
      {authLoading || isLoading ? (
        <VehicleSkeleton count={2} />
      ) : isGuest ? (
        <div className="flex flex-col gap-4 rounded-ctl bg-slate-50 p-5 dark:bg-slate-800/60 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-[15px] font-semibold text-slate-900 dark:text-white">Masuk dulu untuk memilih kendaraan</p>
            <p className="text-[15px] text-slate-600 dark:text-slate-400">
              Layanan, bengkel, dan jam kosong di bawah tetap bisa kamu lihat sekarang.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              href={loginHref}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-ctl bg-primary-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
            >
              <LogIn className="h-4 w-4" aria-hidden />
              Masuk
            </Link>
            <Link
              href="/register"
              className="inline-flex min-h-[44px] items-center rounded-ctl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Daftar
            </Link>
          </div>
        </div>
      ) : isError ? (
        <ErrorState title="Daftar kendaraan belum bisa dimuat" onRetry={onRetry} />
      ) : vehicles.length === 0 ? (
        <EmptyState
          icon={Car}
          title="Belum ada kendaraan di akun kamu"
          description="Tambahkan kendaraan di halaman profil, lalu kembali ke sini untuk booking."
          action={{ label: 'Tambah kendaraan', href: '/profile' }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Pilih kendaraan">
          {vehicles.map((v) => {
            const selected = selectedVehicle === v.id;
            const Icon = isMotor(v.vehicle_type) ? Bike : Car;
            return (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onSelectVehicle(v.id)}
                className={optionClass(selected)}
              >
                <SelectIndicator selected={selected} />
                <span className="min-w-0 flex-1 space-y-2">
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
                    <span className="truncate text-[15px] font-semibold capitalize text-slate-900 dark:text-white">
                      {v.brand} {v.model}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <Plate number={v.plate_number} size="md" />
                    <span className="text-[13px] capitalize text-slate-600 dark:text-slate-400">
                      {v.year ? `${v.year}, ` : ''}
                      {v.vehicle_type}
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
          <Link
            href="/profile"
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-ctl border border-dashed border-slate-300 p-4 text-[15px] font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Tambah kendaraan
          </Link>
        </div>
      )}
    </StepSection>
  );
}
