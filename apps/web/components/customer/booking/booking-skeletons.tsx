import { SkeletonBlock } from '@/components/customer/states';

/** Skeleton baris pilihan (kendaraan, layanan, bengkel) selama data dimuat. */
export function OptionListSkeleton({ count = 3, tall = false }: { count?: number; tall?: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2" role="status" aria-label="Memuat pilihan">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-ctl border border-slate-200 p-4 dark:border-slate-800 sm:p-5"
        >
          <SkeletonBlock className="h-5 w-5 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <SkeletonBlock className="h-4 w-2/3" />
            <SkeletonBlock className="h-3 w-1/2" />
            {tall && <SkeletonBlock className="h-3 w-1/3" />}
          </div>
        </div>
      ))}
    </div>
  );
}

export function VehicleSkeleton({ count = 2 }: { count?: number }) {
  return <OptionListSkeleton count={count} />;
}

export function ServiceSkeleton({ count = 4 }: { count?: number }) {
  return <OptionListSkeleton count={count} tall />;
}

export function BranchSkeleton({ count = 2 }: { count?: number }) {
  return <OptionListSkeleton count={count} tall />;
}

export function SlotSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4" role="status" aria-label="Memuat jam tersedia">
      {Array.from({ length: 8 }).map((_, i) => (
        <SkeletonBlock key={i} className="h-[52px]" />
      ))}
    </div>
  );
}
