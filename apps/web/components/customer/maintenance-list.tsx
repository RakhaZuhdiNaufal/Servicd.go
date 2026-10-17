'use client';

import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { fetcher } from '@/lib/fetcher';

interface Indicator {
  key: string;
  name: string;
  status: 'baik' | 'perlu_cek' | 'belum_ada_data';
  status_label: string;
  months_since: number | null;
  interval_months: number;
  message: string;
}

interface HealthResponse {
  total_services_completed: number;
  indicators: Indicator[];
}

const DOT: Record<Indicator['status'], string> = {
  baik: 'bg-emerald-600',
  perlu_cek: 'bg-amber-500',
  belum_ada_data: 'bg-slate-400'
};

/**
 * Catatan perawatan per kendaraan dari GET /vehicles/[id]/health.
 * Isinya hanya fakta riwayat servis di ServiceGo (kapan terakhir dikerjakan) dan jadwal anjuran,
 * bukan hasil ukur sensor.
 */
export function MaintenanceList({ vehicleId }: { vehicleId: string }) {
  const { data, isLoading, isError, refetch } = useQuery<HealthResponse>({
    queryKey: ['vehicle-health', vehicleId],
    queryFn: () => fetcher(`/vehicles/${vehicleId}/health`)
  });

  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy>
        <div className="h-4 w-1/2 rounded shimmer" />
        <div className="h-4 w-2/3 rounded shimmer" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Catatan perawatan belum bisa dimuat.{' '}
        <button
          type="button"
          onClick={() => refetch()}
          className="font-semibold text-primary-700 hover:underline dark:text-primary-100"
        >
          Coba lagi
        </button>
      </p>
    );
  }

  if (!data.total_services_completed || !Array.isArray(data.indicators)) {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Catatan perawatan muncul setelah servis pertama di ServiceGo selesai.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Catatan perawatan</p>
      <ul className="space-y-1.5">
        {data.indicators.map((it) => (
          <li key={it.key} className="flex items-start gap-2 text-sm" title={it.message}>
            <span aria-hidden className={clsx('mt-1.5 h-2 w-2 shrink-0 rounded-full', DOT[it.status])} />
            <span className="min-w-0">
              <span className="text-slate-900 dark:text-white">{it.name}</span>
              <span className="text-slate-600 dark:text-slate-400">
                {': '}
                {it.status === 'belum_ada_data'
                  ? 'belum ada catatan'
                  : `${it.months_since === 0 ? 'bulan ini' : `${it.months_since} bln lalu`}${
                      it.status === 'perlu_cek' ? `, waktunya dicek (anjuran tiap ${it.interval_months} bln)` : ''
                    }`}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
