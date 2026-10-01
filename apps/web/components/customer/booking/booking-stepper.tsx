'use client';

import { Check } from 'lucide-react';
import { clsx } from 'clsx';

interface BookingStepperProps {
  hasVehicle: boolean;
  hasServices: boolean;
  hasBranch: boolean;
  hasSchedule: boolean;
}

export function BookingStepper({
  hasVehicle,
  hasServices,
  hasBranch,
  hasSchedule
}: BookingStepperProps) {
  // A step is only considered sequentially completed if preceding steps are also satisfied
  const step1Done = hasVehicle;
  const step2Done = step1Done && hasServices;
  const step3Done = step2Done && hasBranch;
  const step4Done = step3Done && hasSchedule;

  // Active step is the earliest incomplete step
  const activeStep = !step1Done ? 1 : !step2Done ? 2 : !step3Done ? 3 : !step4Done ? 4 : 4;

  const steps = [
    { number: 1, label: 'Kendaraan', done: step1Done },
    { number: 2, label: 'Layanan', done: step2Done },
    { number: 3, label: 'Bengkel', done: step3Done },
    { number: 4, label: 'Jadwal', done: step4Done }
  ];

  const lineConnectors = [step1Done, step2Done, step3Done];

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => {
            const isActive = activeStep === step.number && !step.done;

            return (
              <div key={step.number} className="flex-1 flex items-center last:flex-none">
                {/* Step Node */}
                <div className="flex flex-col items-center shrink-0">
                  <div
                    className={clsx(
                      'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition shadow-sm',
                      step.done
                        ? 'bg-primary-600 text-white shadow-primary-600/30'
                        : isActive
                        ? 'border-2 border-primary-600 bg-primary-50 dark:bg-primary-950 text-primary-600 ring-2 ring-primary-500/20'
                        : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-300 dark:border-slate-700'
                    )}
                  >
                    {step.done ? <Check className="h-4 w-4 stroke-[3]" /> : step.number}
                  </div>
                  <span
                    className={clsx(
                      'text-xs font-semibold mt-1.5 whitespace-nowrap',
                      step.done || isActive
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-400 dark:text-slate-500'
                    )}
                  >
                    {step.number}. {step.label}
                  </span>
                </div>

                {/* Segmented connector line to next step */}
                {idx < steps.length - 1 && (
                  <div className="flex-1 mx-2 sm:mx-4 -mt-5">
                    <div
                      className={clsx(
                        'h-0.5 w-full rounded-full transition-colors duration-300',
                        lineConnectors[idx]
                          ? 'bg-primary-600'
                          : 'bg-slate-200 dark:bg-slate-700'
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
