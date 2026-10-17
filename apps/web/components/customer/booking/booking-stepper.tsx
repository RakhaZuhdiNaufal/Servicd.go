'use client';

import { Check } from 'lucide-react';
import { clsx } from 'clsx';
import { BookingStep, BookingStepKey, STEP_ANCHOR } from './types';

interface BookingStepperProps {
  steps: BookingStep[];
  activeStep: BookingStepKey | null;
}

/**
 * Penanda progres booking (3 langkah bila hanya ada satu bengkel, 4 bila perlu memilih bengkel),
 * memakai bahasa visual "garis atas" yang sama dengan bagian "Booking dalam tiga langkah" di landing.
 * Tiap langkah adalah link ke section-nya.
 */
export function BookingStepper({ steps, activeStep }: BookingStepperProps) {
  return (
    <nav aria-label="Langkah booking">
      <ol className={clsx('grid gap-2 sm:gap-4', steps.length === 3 ? 'grid-cols-3' : 'grid-cols-4')}>
        {steps.map((step) => {
          const isActive = step.key === activeStep;
          const lit = step.done || isActive;
          return (
            <li key={step.key}>
              <a
                href={`#${STEP_ANCHOR[step.key]}`}
                aria-current={isActive ? 'step' : undefined}
                className={clsx(
                  'flex min-h-[52px] flex-col gap-0.5 border-t-[3px] pb-1 pt-2.5 transition-colors hover:border-primary-700 dark:hover:border-primary-100',
                  lit ? 'border-primary-600 dark:border-primary-500' : 'border-slate-200 dark:border-slate-700'
                )}
              >
                <span
                  className={clsx(
                    'flex items-center gap-1 text-[13px] font-semibold',
                    lit ? 'text-primary-700 dark:text-primary-100' : 'text-slate-600 dark:text-slate-400'
                  )}
                >
                  {step.done && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />}
                  <span className="hidden sm:inline">Langkah</span> {step.number}
                </span>
                <span
                  className={clsx(
                    'text-[13px] font-bold sm:text-[17px]',
                    lit ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'
                  )}
                >
                  {step.label}
                  <span className="sr-only">{step.done ? ' (sudah dipilih)' : isActive ? ' (langkah sekarang)' : ''}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Bingkai satu langkah. Langkah yang sedang dikerjakan diberi garis biru supaya jadi
 * titik fokus; langkah lain tetap bisa diubah tapi tampil tenang.
 */
export function StepSection({
  stepKey,
  number,
  title,
  description,
  active,
  done,
  aside,
  children
}: {
  stepKey: BookingStepKey;
  number: number;
  title: string;
  description?: string;
  active: boolean;
  done: boolean;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  const headingId = `${STEP_ANCHOR[stepKey]}-judul`;
  return (
    <section
      id={STEP_ANCHOR[stepKey]}
      aria-labelledby={headingId}
      className={clsx(
        'scroll-mt-24 rounded-[20px] border bg-white p-5 transition-colors dark:bg-slate-900 sm:p-7',
        active
          ? 'border-primary-600 ring-1 ring-primary-600 dark:border-primary-500 dark:ring-primary-500'
          : 'border-slate-200 dark:border-slate-800'
      )}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3.5">
          <span
            className={clsx(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
              done
                ? 'bg-primary-600 text-white'
                : active
                ? 'border-2 border-primary-600 text-primary-700 dark:border-primary-500 dark:text-primary-100'
                : 'border border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-400'
            )}
            aria-hidden
          >
            {done ? <Check className="h-4 w-4" strokeWidth={3} /> : number}
          </span>
          <div className="min-w-0">
            <h2
              id={headingId}
              className="text-[20px] font-extrabold leading-tight tracking-[-0.01em] text-slate-900 dark:text-white sm:text-[24px]"
            >
              {title}
            </h2>
            {description && <p className="mt-1 text-[15px] text-slate-600 dark:text-slate-400">{description}</p>}
          </div>
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

/** Kelas bersama untuk kartu pilihan (kendaraan, layanan, bengkel). */
export function optionClass(selected: boolean) {
  return clsx(
    'flex w-full min-h-[44px] items-start gap-3 rounded-2xl border p-4 text-left transition-colors sm:p-5',
    selected
      ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600 dark:border-primary-500 dark:bg-primary-900/40 dark:ring-primary-500'
      : 'border-slate-200 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-500'
  );
}

/** Indikator bulat (radio) atau kotak (checkbox) di kartu pilihan. */
export function SelectIndicator({ selected, shape = 'round' }: { selected: boolean; shape?: 'round' | 'square' }) {
  return (
    <span
      aria-hidden
      className={clsx(
        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center',
        shape === 'round' ? 'rounded-full' : 'rounded-plate',
        selected
          ? 'bg-primary-600 text-white'
          : 'border-2 border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900'
      )}
    >
      {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
    </span>
  );
}
