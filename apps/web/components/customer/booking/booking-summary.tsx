'use client';

import { Car, Bike, MapPin, ChevronRight, Loader2 } from 'lucide-react';
import { Vehicle, Service, Branch } from './types';

interface BookingSummaryProps {
  activeVehicle: Vehicle | null;
  activeServicesList: Service[];
  activeBranch: Branch | null;
  selectedDate: string;
  selectedTime: string;
  totalCost: number;
  isSubmitting: boolean;
  isSubmitDisabled: boolean;
  onSubmit: () => void;
}

const formatRp = (v: number | string) => {
  const num = typeof v === 'string' ? parseFloat(v) : v;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number.isFinite(num) ? num : 0);
};

export function BookingSummary({
  activeVehicle,
  activeServicesList,
  activeBranch,
  selectedDate,
  selectedTime,
  totalCost,
  isSubmitting,
  isSubmitDisabled,
  onSubmit
}: BookingSummaryProps) {
  const formattedDateString = selectedDate
    ? new Date(selectedDate).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : 'Pilih Tanggal';

  const VehicleIcon =
    activeVehicle &&
    (activeVehicle.vehicle_type.toLowerCase() === 'motor' ||
      activeVehicle.vehicle_type.toLowerCase() === 'motorcycle' ||
      activeVehicle.vehicle_type.toLowerCase() === 'sepeda motor')
      ? Bike
      : Car;

  return (
    <div className="sticky top-24">
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Ringkasan Booking</h3>
          <span className="text-xs font-semibold text-primary-600 bg-primary-50 dark:bg-primary-950 px-2.5 py-0.5 rounded-full">
            Pratinjau
          </span>
        </div>

        {/* Vehicle Preview */}
        {activeVehicle ? (
          <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="h-11 w-12 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-primary-600 shrink-0">
              <VehicleIcon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {activeVehicle.brand} {activeVehicle.model}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5 capitalize">
                {activeVehicle.plate_number} · {activeVehicle.year ? `${activeVehicle.year} · ` : ''}
                {activeVehicle.vehicle_type}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="h-11 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
              <Car className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Belum Ada Kendaraan</h4>
              <p className="text-xs text-slate-400 mt-0.5">Pilih atau daftarkan kendaraan Anda</p>
            </div>
          </div>
        )}

        {/* Selected Services */}
        <div className="space-y-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Layanan Dipilih</p>
          {activeServicesList.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Belum ada layanan dipilih</p>
          ) : (
            activeServicesList.map((s) => (
              <div key={s.id} className="flex items-start justify-between text-xs gap-3">
                <span className="font-medium text-slate-800 dark:text-slate-200 leading-snug">
                  {s.name}
                </span>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatRp(s.price)}
                  </span>
                  <span className="text-[10px] text-slate-400 block">{s.duration_minutes} mnt</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bengkel Selection */}
        <div className="space-y-1 pb-4 border-b border-slate-100 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bengkel Tujuan</p>
          {activeBranch ? (
            <>
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {activeBranch.name}
              </p>
              <p className="text-xs text-slate-500 truncate">{activeBranch.address}</p>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3 text-slate-400" />
                <span>{activeBranch.distance || '1.2 km'}</span>
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-400 italic">Belum memilih cabang bengkel</p>
          )}
        </div>

        {/* Jadwal Selection */}
        <div className="space-y-1 pb-4 border-b border-slate-100 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Waktu & Jadwal</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white">{formattedDateString}</p>
          <p className="text-xs text-slate-500 font-mono">
            {selectedTime ? `Pukul ${selectedTime} WIB` : 'Pilih slot jam kedatangan'}
          </p>
        </div>

        {/* Estimasi Biaya Total */}
        <div className="pt-1 space-y-1.5">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 shrink-0">
              Estimasi Total
            </span>
            <span className="font-mono text-xl font-extrabold text-primary-600 dark:text-primary-400 text-right">
              {formatRp(totalCost)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Harga dapat berubah tergantung kondisi suku cadang saat pemeriksaan fisik oleh mekanik.
          </p>
        </div>

        {/* Submit Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitDisabled}
            className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm py-3.5 shadow-md shadow-orange-500/25 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Memproses Booking…</span>
              </span>
            ) : (
              <>
                <span>Konfirmasi Booking</span>
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
