'use client';

import { MapPin, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { Branch } from './types';
import { BranchSkeleton } from './booking-skeletons';

interface BranchSelectorProps {
  branches: Branch[];
  isLoading: boolean;
  selectedBranch: string;
  onSelectBranch: (id: string) => void;
}

export function BranchSelector({
  branches,
  isLoading,
  selectedBranch,
  onSelectBranch
}: BranchSelectorProps) {
  return (
    <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-primary-600 flex items-center justify-center font-bold text-sm">
          3
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Pilih Bengkel Terdekat</h2>
          <p className="text-xs text-slate-500">Semua cabang resmi bergaransi pengerjaan 14 hari</p>
        </div>
      </div>

      {isLoading ? (
        <BranchSkeleton count={2} />
      ) : branches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-slate-400 text-sm">
          Tidak ada cabang bengkel yang ditemukan
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {branches.map((branch) => {
            const isSelected = selectedBranch === branch.id;
            const slotsCount = branch.available_slots_count ?? 0;
            const isFull = slotsCount === 0;

            return (
              <div
                key={branch.id}
                onClick={() => onSelectBranch(branch.id)}
                className={clsx(
                  'rounded-xl border p-4 flex items-start gap-3.5 cursor-pointer transition duration-150 min-h-[96px]',
                  isSelected
                    ? 'border-primary-500 bg-primary-50/40 dark:bg-primary-950/30 ring-2 ring-primary-500/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-primary-300 bg-white dark:bg-slate-900'
                )}
              >
                <div
                  className={clsx(
                    'h-5 w-5 rounded-full flex items-center justify-center shrink-0 transition mt-0.5',
                    isSelected
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'border-2 border-slate-300 dark:border-slate-600'
                  )}
                >
                  {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {branch.name}
                    </h3>
                    {branch.badge && (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 dark:bg-blue-950 px-2 py-0.5 rounded-full shrink-0">
                        {branch.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1">{branch.address}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span>{branch.distance || '1.5 km'}</span>
                    </span>
                    <span>·</span>
                    {isFull ? (
                      <span className="text-red-500 dark:text-red-400 font-medium">
                        ● Penuh
                      </span>
                    ) : (
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        ● Tersedia {slotsCount} slot
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
