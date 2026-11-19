'use client';

import { clsx } from 'clsx';
import { ErrorState } from '@/components/customer/states';
import { TimeSlot } from './types';
import { SlotSkeleton } from './booking-skeletons';
import { StepSection } from './booking-stepper';
import { localDateString } from './use-booking-form';

interface SchedulePickerProps {
  hasBranch: boolean;
  selectedDate: string;
  onDateChange: (date: string) => void;
  selectedTime: string;
  onTimeChange: (time: string) => void;
  complaintNotes: string;
  onComplaintNotesChange: (notes: string) => void;
  slots: TimeSlot[];
  isLoadingSlots: boolean;
  isErrorSlots: boolean;
  onRetrySlots: () => void;
  active: boolean;
  done: boolean;
  /** Nomor langkah (3 bila langkah bengkel dilewati karena hanya ada satu bengkel). */
  number?: number;
}

const fieldClass =
  'w-full rounded-ctl border border-slate-300 bg-white px-4 text-[15px] text-slate-900 transition-colors placeholder:text-slate-500 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600';

export function SchedulePicker({
  hasBranch,
  selectedDate,
  onDateChange,
  selectedTime,
  onTimeChange,
  complaintNotes,
  onComplaintNotesChange,
  slots,
  isLoadingSlots,
  isErrorSlots,
  onRetrySlots,
  active,
  done,
  number = 4
}: SchedulePickerProps) {
  const minDate = localDateString(1);
  const allFull = slots.length > 0 && slots.every((s) => !s.is_available);

  return (
    <StepSection
      stepKey="jadwal"
      number={number}
      title="Kapan kamu datang?"
      description="Servis bisa dijadwalkan mulai besok. Jam dalam WIB."
      active={active}
      done={done}
    >
      <div className="space-y-5">
        <div className="space-y-1.5 sm:max-w-xs">
          <label htmlFor="booking-date" className="text-[15px] font-bold text-slate-900 dark:text-white">
            Tanggal datang
          </label>
          <input
            id="booking-date"
            type="date"
            value={selectedDate}
            min={minDate}
            onChange={(e) => onDateChange(e.target.value)}
            className={clsx(fieldClass, 'h-12 dark:[color-scheme:dark]')}
          />
        </div>

        <fieldset className="space-y-2.5">
          <legend className="text-[15px] font-bold text-slate-900 dark:text-white">Jam datang</legend>
          {!hasBranch ? (
            <p className="rounded-ctl bg-slate-50 px-4 py-3.5 text-[15px] text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
              Pilih bengkel dulu, nanti jam yang masih kosong muncul di sini.
            </p>
          ) : !selectedDate ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">Pilih tanggal dulu.</p>
          ) : isLoadingSlots ? (
            <SlotSkeleton />
          ) : isErrorSlots ? (
            <ErrorState title="Jam kosong belum bisa dicek" onRetry={onRetrySlots} />
          ) : slots.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">Belum ada jadwal operasional untuk tanggal ini.</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4" role="radiogroup" aria-label="Jam datang">
                {slots.map((slot) => {
                  const selected = selectedTime === slot.time;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={!slot.is_available}
                      onClick={() => onTimeChange(slot.time)}
                      className={clsx(
                        'flex min-h-[48px] flex-col items-center justify-center rounded-ctl border px-2 py-1.5 text-[15px] font-semibold transition-colors',
                        selected
                          ? 'border-primary-600 bg-primary-600 font-bold text-white'
                          : slot.is_available
                          ? 'border-slate-300 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800'
                          : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-500'
                      )}
                    >
                      {slot.time}
                      {!slot.is_available && <span className="text-[11px] font-medium">Penuh</span>}
                    </button>
                  );
                })}
              </div>
              {allFull && (
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  Semua jam di tanggal ini sudah penuh. Coba tanggal lain.
                </p>
              )}
            </>
          )}
        </fieldset>

        <div className="space-y-1.5 border-t border-slate-200 pt-5 dark:border-slate-800">
          <label htmlFor="booking-notes" className="text-[15px] font-bold text-slate-900 dark:text-white">
            Keluhan kendaraan <span className="font-normal text-slate-600 dark:text-slate-400">(opsional)</span>
          </label>
          <textarea
            id="booking-notes"
            rows={3}
            placeholder="Misal: ada bunyi decit saat mengerem"
            value={complaintNotes}
            onChange={(e) => onComplaintNotesChange(e.target.value)}
            className={clsx(fieldClass, 'resize-none py-3')}
          />
        </div>
      </div>
    </StepSection>
  );
}
