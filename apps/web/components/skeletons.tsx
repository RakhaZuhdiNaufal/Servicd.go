export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {/* header */}
        <div className="flex gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-800">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-4 rounded shimmer flex-1" />
          ))}
        </div>
        {/* rows */}
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 px-4 py-3">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className={`h-4 rounded shimmer flex-1 ${c === 0 ? 'max-w-[100px]' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonCard({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <div className="h-5 w-3/4 rounded shimmer" />
          <div className="h-4 w-1/2 rounded shimmer" />
          <div className="h-4 w-full rounded shimmer" />
          <div className="h-8 w-24 rounded shimmer" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 rounded shimmer ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  );
}
