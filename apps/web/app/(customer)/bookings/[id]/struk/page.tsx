'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Printer } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { ErrorState, SkeletonBlock } from '@/components/customer/states';
import { btnSecondary } from '@/components/customer/ui';
import { Struk, type StrukBooking } from '@/components/customer/struk';

/** Halaman struk tersendiri: kertasnya saja, siap dicetak. */
export default function StrukPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: booking, isLoading, isError, error, refetch } = useQuery<StrukBooking>({
    queryKey: ['booking', id],
    queryFn: () => fetcher(`/bookings/${id}`)
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-sm space-y-4" role="status" aria-label="Memuat struk">
        <SkeletonBlock className="h-8 w-40" />
        <SkeletonBlock className="h-96 w-full rounded-[20px]" />
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="mx-auto max-w-sm">
        <ErrorState title="Struk belum bisa dimuat" message={(error as Error)?.message} onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm space-y-5">
      {/* print:hidden supaya yang tercetak hanya kertas struknya. */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/bookings/${booking.id}`}
          className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-semibold text-slate-900 hover:underline dark:text-white"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
          Detail booking
        </Link>
        <button type="button" onClick={() => window.print()} className={btnSecondary}>
          <Printer className="h-4 w-4" aria-hidden />
          Cetak
        </button>
      </div>

      <Struk booking={booking} />
    </div>
  );
}
