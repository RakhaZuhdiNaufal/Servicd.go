'use client';

// Kit kecil untuk halaman data admin (Pelanggan, Kendaraan, Layanan, Mekanik, Live Support).
// Mengikuti DESIGN.md bagian "Panel admin": padat, konsisten, biru, tanpa oranye.

import { useEffect, useId, useRef } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { clsx } from 'clsx';

export const btnPrimary =
  'inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-ctl bg-primary-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60';
export const btnSecondary =
  'inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-ctl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';
export const btnDanger =
  'inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-ctl bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60';
/** Tombol aksi kecil di baris tabel. */
export const btnRow =
  'inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-chip px-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800';
export const btnRowDanger =
  'inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-chip px-2.5 text-[13px] font-medium text-red-700 transition-colors hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40';

export const inputCls =
  'w-full min-h-[40px] rounded-ctl border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-500 transition-colors focus:border-primary-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 aria-[invalid=true]:border-red-500 dark:aria-[invalid=true]:border-red-500';

export function AdminPageHeader({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 gap-2">{action}</div>}
    </div>
  );
}

/** Bingkai tabel: kartu putih tanpa shadow, scroll horizontal di dalam kartu bila perlu. */
export function TableCard({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">{children}</div>
      {footer}
    </div>
  );
}

export function Th({ children, align = 'left', className }: { children?: React.ReactNode; align?: 'left' | 'right' | 'center'; className?: string }) {
  return (
    <th
      scope="col"
      className={clsx(
        'h-11 whitespace-nowrap px-4 text-[13px] font-semibold text-slate-600 dark:text-slate-400',
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, align = 'left', className }: { children?: React.ReactNode; align?: 'left' | 'right' | 'center'; className?: string }) {
  return (
    <td
      className={clsx(
        'h-[52px] px-4 py-2 align-middle',
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
        className
      )}
    >
      {children}
    </td>
  );
}

export const theadCls = 'border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60';
export const tbodyCls = 'divide-y divide-slate-100 dark:divide-slate-800';

/** Skeleton berbentuk tabel, tinggi baris sama dengan baris asli. */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div aria-busy aria-label="Memuat data" className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-11 items-center gap-6 border-b border-slate-200 bg-slate-50 px-4 dark:border-slate-800 dark:bg-slate-900/60">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 flex-1 rounded shimmer" />
        ))}
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex h-[52px] items-center gap-6 px-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className={clsx('h-3.5 flex-1 rounded shimmer', c === 0 && 'max-w-[160px]')} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  unit,
  onChange
}: {
  page: number;
  totalPages: number;
  total: number;
  unit: string;
  onChange: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-2.5 text-[13px] text-slate-600 dark:border-slate-800 dark:text-slate-400">
      <span className="tabular-nums">
        {total.toLocaleString('id-ID')} {unit}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChange(page - 1)}
            disabled={page <= 1}
            aria-label="Halaman sebelumnya"
            className="inline-flex h-9 w-9 items-center justify-center rounded-chip transition-colors hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <span className="px-1 tabular-nums">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Halaman berikutnya"
            className="inline-flex h-9 w-9 items-center justify-center rounded-chip transition-colors hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}

/** Kontrol segmen untuk filter kecil (tipe, status). */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex self-start rounded-ctl border border-slate-300 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'min-h-[36px] whitespace-nowrap rounded-[10px] px-3 text-sm font-medium transition-colors',
            value === o.value
              ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-100'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Label aktif/nonaktif (bukan status booking). */
export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium',
        active
          ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300'
          : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
      )}
    >
      <span aria-hidden className={clsx('h-1.5 w-1.5 rounded-full', active ? 'bg-green-600' : 'bg-slate-400')} />
      {active ? 'Aktif' : 'Nonaktif'}
    </span>
  );
}

/** Avatar inisial (tanpa foto, sesuai aturan antislop R-23). */
export function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const text = ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
  return (
    <span
      aria-hidden
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-100"
    >
      {text}
    </span>
  );
}

/**
 * Dialog berbasis elemen <dialog> native: fokus terkunci, Escape menutup, klik latar menutup.
 */
export function AdminDialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md'
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md';
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={clsx(
        'fixed inset-0 !m-auto h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100',
        size === 'sm' ? 'max-w-sm' : 'max-w-lg'
      )}
    >
      {open && (
        <div className="flex max-h-[85dvh] flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-semibold text-slate-900 dark:text-white">
                {title}
              </h2>
              {description && <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="-mr-2 -mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-ctl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-800 sm:flex-row sm:justify-end">
              {footer}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}

/** Field form: label, kontrol, petunjuk atau error di bawahnya. */
export function Field({
  id,
  label,
  error,
  hint,
  required,
  children
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-800 dark:text-slate-200">
        {label}
        {required && <span className="text-red-600 dark:text-red-400"> *</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-[13px] text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-slate-600 dark:text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Kotak pencarian dengan ikon; submit lewat form induk atau langsung onChange. */
export function SearchInput({
  id,
  value,
  onChange,
  placeholder,
  label
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <div className="relative min-w-0 flex-1 sm:max-w-sm">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={clsx(inputCls, 'pl-9')}
      />
    </div>
  );
}
