'use client';

import { Calendar, Clock, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { TimeSlot } from './types';

interface SchedulePickerProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  selectedTime: string;
  onTimeChange: (time: string) => void;
  complaintNotes: string;
  onComplaintNotesChange: (notes: string) => void;
  availableSlots: TimeSlot[];
  isLoadingSlots: boolean;
  isErrorSlots: boolean;
}

export function SchedulePicker({
  selectedDate,
  onDateChange,
  selectedTime,
  onTimeChange,
  complaintNotes,
  onComplaintNotesChange,
  availableSlots,
  isLoadingSlots,
  isErrorSlots
}: SchedulePickerProps) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-primary-600 flex items-center justify-center font-bold text-sm">
          4
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Jadwal & Catatan Servis</h2>
          <p className="text-xs text-slate-500">Tentukan waktu kedatangan Anda ke bengkel</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Date picker */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-primary-600" />
            <span>Tanggal Kedatangan</span>
          </label>
          <input
            type="date"
            value={selectedDate}
            min={minDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/70 px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Time slot picker */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-primary-600" />
            <span>Pukul Kedatangan</span>
          </label>
          <div className="relative">
            <select
              value={selectedTime}
              disabled={isLoadingSlots || isErrorSlots || availableSlots.length === 0}
              onChange={(e) => onTimeChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/70 px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoadingSlots ? (
                <option value="">Memuat slot waktu...</option>
              ) : isErrorSlots ? (
                <option value="">Gagal memuat slot</option>
              ) : availableSlots.length === 0 ? (
                <option value="">Tidak ada slot tersedia</option>
              ) : (
                <>
                  <option value="">-- Pilih Jam Kedatangan --</option>
                  {availableSlots.map((slot) => (
                    <option key={slot.time} value={slot.time}>
                      Pukul {slot.time} WIB
                    </option>
                  ))}
                </>
              )}
            </select>
            {isLoadingSlots && (
              <div className="absolute right-3 top-3.5 text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
          </div>

          {/* Helper hint for empty slots */}
          {!isLoadingSlots && !isErrorSlots && availableSlots.length === 0 && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>Semua slot waktu di tanggal ini sudah penuh, silakan pilih tanggal lain.</span>
            </p>
          )}
        </div>
      </div>

      {/* Complaint notes */}
      <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-primary-600" />
          <span>Catatan Gejala / Keluhan Kendaraan (Opsional)</span>
        </label>
        <textarea
          rows={3}
          placeholder="Contoh: Bunyi decit saat pengereman, lampu indikator oli sempat berkedip, dll…"
          value={complaintNotes}
          onChange={(e) => onComplaintNotesChange(e.target.value)}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/70 px-4 py-3 text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />
      </div>
    </section>
  );
}
