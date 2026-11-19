import Link from 'next/link';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { clsx } from 'clsx';

/** State kosong: jelaskan kenapa kosong dan apa langkah berikutnya. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className
}: {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: { label: string; href?: string; onClick?: () => void };
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center text-center gap-3 rounded-ctl border border-dashed border-slate-300 dark:border-slate-700 px-6 py-10',
        className
      )}
    >
      {Icon && (
        <span className="flex h-11 w-11 items-center justify-center rounded-ctl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      )}
      <div className="space-y-1 max-w-sm">
        <p className="font-semibold text-slate-900 dark:text-slate-100">{title}</p>
        {description && <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>}
      </div>
      {action &&
        (action.href ? (
          <Link
            href={action.href}
            className="mt-1 inline-flex min-h-[44px] items-center rounded-ctl bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
          >
            {action.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-1 inline-flex min-h-[44px] items-center rounded-ctl bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
          >
            {action.label}
          </button>
        ))}
    </div>
  );
}

/** State error: tampilkan pesan dan tombol coba lagi. */
export function ErrorState({
  title = 'Data belum bisa dimuat',
  message,
  onRetry,
  className
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={clsx(
        'flex flex-col gap-4 rounded-[20px] border border-slate-200 bg-white px-5 py-5 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900',
        className
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ctl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-[15px] font-semibold text-slate-900 dark:text-white">{title}</p>
        {message && <p className="break-words text-sm text-slate-600 dark:text-slate-400">{message}</p>}
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 self-start rounded-ctl border border-slate-300 bg-white px-4 text-[15px] font-semibold text-slate-900 transition-colors hover:bg-slate-50 sm:self-auto dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
        >
          <RotateCw className="h-4 w-4" aria-hidden />
          Coba lagi
        </button>
      )}
    </div>
  );
}

/** Blok skeleton sederhana untuk state loading. */
export function SkeletonBlock({ className }: { className?: string }) {
  return <div aria-hidden className={clsx('rounded-ctl shimmer', className)} />;
}

/** Judul halaman yang konsisten di semua halaman pelanggan. */
export function PageHeader({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-[28px] font-bold leading-tight text-slate-900 dark:text-white">{title}</h1>
        {description && <p className="text-[15px] text-slate-600 dark:text-slate-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}
