import { clsx } from 'clsx';

/**
 * Motif identitas ServiceGo (lihat DESIGN.md): nomor polisi tampil sebagai plat kecil.
 * Kotak tinta gelap, teks putih monospace, garis tepi dalam tipis seperti plat asli.
 */
export function Plate({
  number,
  size = 'md',
  className
}: {
  number: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center rounded-plate bg-slate-900 text-white font-mono font-medium tracking-wide whitespace-nowrap',
        'ring-1 ring-inset ring-white/25 outline outline-1 outline-slate-900 dark:bg-slate-950 dark:outline-slate-600',
        size === 'sm' && 'px-1.5 py-0.5 text-[11px]',
        size === 'md' && 'px-2 py-1 text-xs',
        size === 'lg' && 'px-3 py-1.5 text-sm',
        className
      )}
      aria-label={`Nomor polisi ${number}`}
    >
      {number.toUpperCase()}
    </span>
  );
}
