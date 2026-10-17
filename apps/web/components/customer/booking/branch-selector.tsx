'use client';

import { MapPin } from 'lucide-react';
import { clsx } from 'clsx';
import { shortBranchName } from '@/lib/format';
import { EmptyState, ErrorState } from '@/components/customer/states';
import { WorkshopSmall } from '@/components/illustrations/workshop';
import { Branch } from './types';
import { BranchSkeleton } from './booking-skeletons';
import { StepSection, SelectIndicator } from './booking-stepper';

interface BranchSelectorProps {
  branches: Branch[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  selectedBranch: string;
  onSelectBranch: (id: string) => void;
  active: boolean;
  done: boolean;
}

/**
 * Bengkel tujuan booking.
 * - Hanya satu bengkel: tidak perlu memilih, tampil sebagai baris tetap "Bengkel: <nama>".
 * - Lebih dari satu: langkah pilihan biasa (kartu dengan ilustrasi bengkel).
 */
export function BranchSelector({
  branches,
  isLoading,
  isError,
  onRetry,
  selectedBranch,
  onSelectBranch,
  active,
  done
}: BranchSelectorProps) {
  if (!isLoading && !isError && branches.length === 1) {
    return <FixedBranchLine branch={branches[0]} />;
  }

  return (
    <StepSection
      stepKey="bengkel"
      number={3}
      title="Servis di bengkel mana?"
      description="Jam kosong di langkah berikutnya mengikuti bengkel ini."
      active={active}
      done={done}
    >
      {isLoading ? (
        <BranchSkeleton count={2} />
      ) : isError ? (
        <ErrorState title="Data bengkel belum bisa dimuat" onRetry={onRetry} />
      ) : branches.length === 0 ? (
        <EmptyState icon={MapPin} title="Belum ada bengkel terdaftar" description="Coba cek lagi nanti." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Pilih bengkel">
          {branches.map((branch) => {
            const selected = selectedBranch === branch.id;
            return (
              <button
                key={branch.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onSelectBranch(branch.id)}
                className={clsx(
                  'flex w-full flex-col overflow-hidden rounded-2xl border text-left transition-colors',
                  selected
                    ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600 dark:border-primary-500 dark:bg-primary-900/40 dark:ring-primary-500'
                    : 'border-slate-200 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-500'
                )}
              >
                <span className="block h-28 w-full overflow-hidden sm:h-32">
                  <WorkshopSmall decorative cover />
                </span>
                <span className="flex items-start gap-3 p-4 sm:p-5">
                  <SelectIndicator selected={selected} />
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="block text-[17px] font-bold text-slate-900 dark:text-white">
                      {shortBranchName(branch.name)}
                    </span>
                    <span className="line-clamp-2 block text-sm text-slate-600 dark:text-slate-400">{branch.address}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </StepSection>
  );
}

/** Baris baca-saja bila ServiceGo hanya punya satu bengkel (otomatis terpilih). */
function FixedBranchLine({ branch }: { branch: Branch }) {
  return (
    <section
      id="langkah-bengkel"
      aria-label="Bengkel tujuan"
      className="flex items-center gap-4 rounded-[20px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5"
    >
      <span className="block w-20 shrink-0 overflow-hidden rounded-ctl sm:w-24">
        <WorkshopSmall decorative />
      </span>
      <div className="min-w-0">
        <p className="text-[15px] text-slate-900 dark:text-white">
          <span className="text-slate-600 dark:text-slate-400">Bengkel: </span>
          <span className="font-bold">{branch.name}</span>
        </p>
        <p className="mt-0.5 flex items-start gap-1.5 text-sm text-slate-600 dark:text-slate-400">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {branch.address}
        </p>
      </div>
    </section>
  );
}
