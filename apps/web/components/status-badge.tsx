import { Clock, CalendarCheck, Wrench, CheckCircle, XCircle } from 'lucide-react';
import { clsx } from 'clsx';

type Status = 'menunggu' | 'dikonfirmasi' | 'diproses' | 'selesai' | 'dibatalkan';

const CONFIG: Record<Status, { icon: React.ElementType; label: string; cls: string }> = {
  menunggu: {
    icon: Clock,
    label: 'Menunggu Konfirmasi',
    cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
  },
  dikonfirmasi: {
    icon: CalendarCheck,
    label: 'Dikonfirmasi',
    cls: 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800'
  },
  diproses: {
    icon: Wrench,
    label: 'Sedang Dikerjakan',
    cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
  },
  selesai: {
    icon: CheckCircle,
    label: 'Selesai / Siap Diambil',
    cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800'
  },
  dibatalkan: {
    icon: XCircle,
    label: 'Dibatalkan',
    cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
  }
};

interface StatusBadgeProps {
  status: Status;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const { icon: Icon, label, cls } = CONFIG[status] ?? CONFIG.menunggu;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        cls
      )}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} strokeWidth={2} />
      {label}
    </span>
  );
}
