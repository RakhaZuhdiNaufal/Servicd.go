'use client';

import Link from 'next/link';
import { Loader2, LogIn, Tag, X } from 'lucide-react';
import { clsx } from 'clsx';
import { formatDate, formatDuration, formatRp } from '@/lib/format';
import { Plate } from '@/components/customer/plate';
import { Vehicle, Service, Branch, PromoInfo } from './types';

interface SummaryData {
  activeVehicle: Vehicle | null;
  activeServicesList: Service[];
  activeBranch: Branch | null;
  selectedDate: string;
  selectedTime: string;
  totalCost: number;
  totalDuration: number;
  promoDiscount: number;
  finalCost: number;
  appliedPromo: PromoInfo | null;
}

export interface PromoFieldProps {
  promoInput: string;
  onPromoInputChange: (v: string) => void;
  appliedPromo: PromoInfo | null;
  promoError: string | null;
  promoLoading: boolean;
  onApplyPromo: () => void;
  onRemovePromo: () => void;
  idPrefix?: string;
}

/** Kolom kode promo. Diskon divalidasi lagi di server saat booking dibuat. */
export function PromoField({
  promoInput,
  onPromoInputChange,
  appliedPromo,
  promoError,
  promoLoading,
  onApplyPromo,
  onRemovePromo,
  idPrefix = 'promo'
}: PromoFieldProps) {
  const inputId = `${idPrefix}-kode`;
  const errorId = `${idPrefix}-error`;

  if (appliedPromo) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-ctl border border-emerald-200 bg-emerald-50 py-1.5 pl-3 pr-1.5 dark:border-emerald-900 dark:bg-emerald-950/40">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
          <Tag className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden />
          <span className="rounded-plate bg-slate-900 px-2 py-0.5 font-mono text-[13px] font-semibold tracking-wide text-white ring-1 ring-inset ring-white/25 dark:bg-slate-950">
            <span className="sr-only">Kode promo </span>
            {appliedPromo.code}
          </span>
          <span className="text-emerald-900 dark:text-emerald-100">diskon {appliedPromo.discount_percent}% dipakai</span>
        </div>
        <button
          type="button"
          onClick={onRemovePromo}
          aria-label={`Hapus kode promo ${appliedPromo.code}`}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-ctl text-emerald-800 transition-colors hover:bg-emerald-100 dark:text-emerald-200 dark:hover:bg-emerald-900/50"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <form
      className="space-y-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        onApplyPromo();
      }}
    >
      <label htmlFor={inputId} className="text-sm font-semibold text-slate-800 dark:text-slate-200">
        Kode promo <span className="font-normal text-slate-600 dark:text-slate-400">(opsional)</span>
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          value={promoInput}
          onChange={(e) => onPromoInputChange(e.target.value)}
          placeholder="Contoh: HEMAT20"
          autoComplete="off"
          aria-invalid={!!promoError}
          aria-describedby={promoError ? errorId : undefined}
          className={clsx(
            'h-12 min-w-0 flex-1 rounded-ctl border bg-white px-3.5 font-mono text-[15px] uppercase text-slate-900 placeholder:font-sans placeholder:normal-case placeholder:text-slate-500 dark:bg-slate-900 dark:text-white',
            promoError ? 'border-red-500 dark:border-red-500' : 'border-slate-300 dark:border-slate-700'
          )}
        />
        <button
          type="submit"
          disabled={promoLoading}
          className="h-12 shrink-0 rounded-ctl border border-slate-300 bg-white px-4 text-[15px] font-semibold text-slate-900 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
        >
          Pakai
        </button>
      </div>
      {promoError && (
        <p id={errorId} className="text-[13px] text-red-700 dark:text-red-300" role="alert">
          {promoError}
        </p>
      )}
    </form>
  );
}

interface ActionProps {
  isGuest: boolean;
  loginHref: string;
  isSubmitting: boolean;
  isSubmitDisabled: boolean;
  missingHint: string | null;
  onSubmit: () => void;
}

function dateLabel(date: string) {
  if (!date) return null;
  return formatDate(new Date(`${date}T00:00:00+07:00`), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Satu-satunya tombol aksen oranye di halaman booking. Untuk tamu, tombol ini diganti
 * link masuk (biru) karena booking butuh akun.
 */
export function ConfirmButton({
  isGuest,
  loginHref,
  isSubmitting,
  isSubmitDisabled,
  onSubmit,
  className,
  compact = false,
  onDark = false
}: Omit<ActionProps, 'missingHint'> & { className?: string; compact?: boolean; onDark?: boolean }) {
  const size = compact ? 'min-h-[48px] px-4 text-[15px]' : 'min-h-[48px] px-6 text-[17px]';
  if (isGuest) {
    return (
      <Link
        href={loginHref}
        className={clsx(
          'inline-flex items-center justify-center gap-2 rounded-ctl bg-primary-600 font-bold text-white transition-colors hover:bg-primary-700',
          size,
          className
        )}
      >
        <LogIn className="h-5 w-5" aria-hidden />
        {compact ? 'Masuk' : 'Masuk untuk booking'}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onSubmit}
      disabled={isSubmitDisabled}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-ctl bg-accent-500 font-bold text-slate-950 transition-colors hover:bg-accent-600 disabled:cursor-not-allowed',
        onDark
          ? 'disabled:bg-slate-700 disabled:text-slate-300'
          : 'disabled:bg-slate-200 disabled:text-slate-600 dark:disabled:bg-slate-800 dark:disabled:text-slate-400',
        size,
        className
      )}
    >
      {isSubmitting ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Membuat booking...
        </>
      ) : (
        'Konfirmasi booking'
      )}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 py-3.5 first:pt-0">
      <dt className="text-[13px] font-semibold text-slate-600 dark:text-slate-400">{label}</dt>
      <dd className="text-[15px] text-slate-900 dark:text-white">{children}</dd>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <span className="text-slate-600 dark:text-slate-400">{children}</span>;
}

/** Rincian pilihan. Dipakai di kartu ringkasan desktop dan di ringkasan akhir versi mobile. */
export function SummaryDetails({
  activeVehicle,
  activeServicesList,
  activeBranch,
  selectedDate,
  selectedTime
}: Omit<SummaryData, 'totalCost' | 'totalDuration' | 'promoDiscount' | 'finalCost' | 'appliedPromo'>) {
  return (
    <dl className="divide-y divide-slate-200 dark:divide-slate-800">
      <Row label="Kendaraan">
        {activeVehicle ? (
          <span className="flex flex-wrap items-center gap-2">
            <Plate number={activeVehicle.plate_number} size="md" />
            <span className="font-semibold capitalize">
              {activeVehicle.brand} {activeVehicle.model}
            </span>
          </span>
        ) : (
          <Empty>Belum dipilih</Empty>
        )}
      </Row>
      <Row label="Layanan">
        {activeServicesList.length === 0 ? (
          <Empty>Belum dipilih</Empty>
        ) : (
          <ul className="space-y-1.5">
            {activeServicesList.map((s) => (
              <li key={s.id} className="flex items-start justify-between gap-3">
                <span>{s.name}</span>
                <span className="shrink-0 text-slate-700 dark:text-slate-300">{formatRp(s.price)}</span>
              </li>
            ))}
          </ul>
        )}
      </Row>
      <Row label="Bengkel">
        {activeBranch ? (
          <span className="font-semibold">{activeBranch.name}</span>
        ) : (
          <Empty>Belum dipilih</Empty>
        )}
      </Row>
      <Row label="Jadwal datang">
        {selectedDate ? (
          <>
            {dateLabel(selectedDate)}
            <span className="block text-slate-700 dark:text-slate-300">
              {selectedTime ? `Pukul ${selectedTime} WIB` : 'Jam belum dipilih'}
            </span>
          </>
        ) : (
          <Empty>Belum dipilih</Empty>
        )}
      </Row>
    </dl>
  );
}

/** Blok biaya di panel gelap: subtotal, potongan promo, dan estimasi akhir. */
function CostBlock({
  totalCost,
  totalDuration,
  promoDiscount,
  finalCost,
  appliedPromo
}: Pick<SummaryData, 'totalCost' | 'totalDuration' | 'promoDiscount' | 'finalCost' | 'appliedPromo'>) {
  return (
    <div className="space-y-1">
      {appliedPromo && totalCost > 0 && (
        <dl className="mb-3 space-y-1.5 border-b border-slate-700 pb-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-300">Subtotal layanan</dt>
            <dd className="text-white">{formatRp(totalCost)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-300">Diskon {appliedPromo.code}</dt>
            <dd className="font-semibold text-emerald-300">-{formatRp(promoDiscount)}</dd>
          </div>
        </dl>
      )}
      <p className="text-sm font-semibold text-slate-300">Estimasi biaya</p>
      <p className="text-[32px] font-bold leading-tight tracking-[-0.015em] text-white">{formatRp(finalCost)}</p>
      <p className="text-[13px] leading-relaxed text-slate-300">
        {totalDuration > 0 ? `Perkiraan pengerjaan ${formatDuration(totalDuration)}. ` : ''}
        Biaya akhir bisa berubah setelah mekanik memeriksa kendaraan.
      </p>
    </div>
  );
}

/**
 * Kartu ringkasan sticky di kolom kanan (desktop). Bagian bawahnya panel gelap berisi
 * estimasi dan tombol konfirmasi: jeda ritme halaman dan titik fokus aksi utama.
 */
export function BookingSummary(props: SummaryData & ActionProps & { promo: PromoFieldProps }) {
  const { totalCost, totalDuration, promoDiscount, finalCost, appliedPromo, missingHint, promo, ...rest } = props;
  return (
    <aside
      aria-label="Ringkasan booking"
      className="sticky top-24 overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_24px_48px_-24px_rgba(15,23,42,0.25)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40"
    >
      <div className="space-y-5 p-6">
        <h2 className="text-[24px] font-bold tracking-[-0.01em] text-slate-900 dark:text-white">Ringkasan</h2>
        <SummaryDetails {...props} />
        <div className="border-t border-slate-200 pt-5 dark:border-slate-800">
          <PromoField {...promo} idPrefix="promo-desktop" />
        </div>
      </div>
      <div className="space-y-4 bg-slate-900 p-6 text-white dark:bg-slate-950 dark:ring-1 dark:ring-inset dark:ring-slate-800">
        <CostBlock
          totalCost={totalCost}
          totalDuration={totalDuration}
          promoDiscount={promoDiscount}
          finalCost={finalCost}
          appliedPromo={appliedPromo}
        />
        <ConfirmButton {...rest} onDark className="w-full" />
        {missingHint && (
          <p className="text-center text-[13px] text-slate-300" aria-live="polite">
            {missingHint}
          </p>
        )}
      </div>
    </aside>
  );
}

/** Bar ringkas di bawah layar (mobile), di atas navigasi bawah. */
export function MobileBookingBar(props: SummaryData & ActionProps) {
  const { totalCost, totalDuration, finalCost, appliedPromo, promoDiscount, activeServicesList, missingHint, ...rest } = props;
  return (
    <div
      aria-label="Ringkasan biaya"
      role="region"
      className="sticky bottom-16 z-30 lg:hidden -mx-4 border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900 sm:-mx-6 sm:px-6 md:bottom-0"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] text-slate-600 dark:text-slate-400">
            Estimasi{activeServicesList.length > 0 ? `, ${activeServicesList.length} layanan` : ''}
            {appliedPromo ? `, diskon ${appliedPromo.discount_percent}%` : ''}
          </p>
          <p className="truncate text-xl font-bold tracking-[-0.01em] text-slate-900 dark:text-white">
            {formatRp(finalCost)}
          </p>
          <p className="truncate text-[13px] text-slate-600 dark:text-slate-400">
            {missingHint ?? (totalDuration > 0 ? `Sekitar ${formatDuration(totalDuration)}` : 'Siap dikonfirmasi')}
          </p>
        </div>
        <ConfirmButton {...rest} compact className="shrink-0" />
      </div>
    </div>
  );
}
