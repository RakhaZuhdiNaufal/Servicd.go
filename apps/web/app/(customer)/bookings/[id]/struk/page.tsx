'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { ChevronLeft, Printer } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { ErrorState, SkeletonBlock } from '@/components/customer/states';
import { bookingCode, formatDate, formatRp, formatTime } from '@/lib/format';
import { btnSecondary, card } from '@/components/customer/ui';
import {
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  PAYMENT_TYPE,
  sudahDibayar,
  type Payment
} from '@/components/customer/payment';

/** Struk pembayaran: data yang sama dengan detail booking, disusun seperti nota kasir. */

interface Booking {
  id: string;
  scheduled_at: string;
  estimated_cost: number | string;
  final_cost: number | string | null;
  vehicle: { plate_number: string; brand: string; model: string };
  booking_services: Array<{ price_at_booking?: number | string; service: { name: string; price?: number | string } }>;
  branch: { name: string; address: string; phone: string } | null;
  customer?: { full_name: string } | null;
  payments?: Payment[];
}

function Baris({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-slate-600 dark:text-slate-400">{label}</span>
      <span className="text-right text-slate-900 dark:text-white">{children}</span>
    </div>
  );
}

export default function StrukPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: booking, isLoading, isError, error, refetch } = useQuery<Booking>({
    queryKey: ['booking', id],
    queryFn: () => fetcher(`/bookings/${id}`)
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-xl space-y-4" role="status" aria-label="Memuat struk">
        <SkeletonBlock className="h-8 w-40" />
        <SkeletonBlock className="h-96 w-full rounded-[20px]" />
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="mx-auto max-w-xl">
        <ErrorState title="Struk belum bisa dimuat" message={(error as Error)?.message} onRetry={() => refetch()} />
      </div>
    );
  }

  const payments = booking.payments ?? [];
  const total = Number(booking.final_cost ?? booking.estimated_cost);
  const dibayar = sudahDibayar(payments);
  const sisa = Math.max(0, total - dibayar);

  return (
    <div className="mx-auto max-w-xl space-y-5">
      {/* print:hidden supaya yang tercetak hanya struknya. */}
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
          Cetak / simpan PDF
        </button>
      </div>

      <article className={clsx(card, 'p-6 sm:p-8 print:border-0')}>
        <header className="space-y-1 border-b border-dashed border-slate-300 pb-5 text-center dark:border-slate-700">
          <p className="text-[19px] font-bold tracking-[-0.01em] text-slate-900 dark:text-white">ServiceGo</p>
          {booking.branch && (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-400">{booking.branch.name}</p>
              <p className="text-[13px] text-slate-600 dark:text-slate-400">{booking.branch.address}</p>
              <p className="text-[13px] text-slate-600 dark:text-slate-400">{booking.branch.phone}</p>
            </>
          )}
        </header>

        <div className="space-y-1.5 border-b border-dashed border-slate-300 py-5 dark:border-slate-700">
          <Baris label="Kode booking">
            <span className="font-mono">{bookingCode(booking.id)}</span>
          </Baris>
          {booking.customer?.full_name && <Baris label="Pelanggan">{booking.customer.full_name}</Baris>}
          <Baris label="Kendaraan">
            {booking.vehicle.plate_number} · {booking.vehicle.brand} {booking.vehicle.model}
          </Baris>
          <Baris label="Tanggal servis">
            {formatDate(booking.scheduled_at)}, {formatTime(booking.scheduled_at)}
          </Baris>
        </div>

        <div className="space-y-2 border-b border-dashed border-slate-300 py-5 dark:border-slate-700">
          {booking.booking_services.map((bs, i) => (
            <Baris key={i} label={bs.service.name}>
              {formatRp(bs.price_at_booking ?? bs.service.price ?? 0)}
            </Baris>
          ))}
          <div className="flex justify-between gap-4 pt-2 text-[15px] font-semibold text-slate-900 dark:text-white">
            <span>Total tagihan</span>
            <span>{formatRp(total)}</span>
          </div>
        </div>

        <div className="space-y-2 py-5">
          {payments.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">Belum ada pembayaran yang tercatat.</p>
          ) : (
            payments.map((p) => (
              <Baris key={p.id} label={`${PAYMENT_TYPE[p.payment_type]} · ${PAYMENT_METHOD[p.method]}`}>
                {formatRp(p.amount)}
                <span className="block text-[13px] text-slate-600 dark:text-slate-400">
                  {PAYMENT_STATUS[p.status]}
                  {p.paid_at ? ` · ${formatDate(p.paid_at)}` : ''}
                </span>
              </Baris>
            ))
          )}
        </div>

        <div className="space-y-1.5 border-t border-dashed border-slate-300 pt-5 dark:border-slate-700">
          <Baris label="Sudah dibayar">{formatRp(dibayar)}</Baris>
          <div className="flex items-baseline justify-between gap-4">
            <span className="font-semibold text-slate-900 dark:text-white">{sisa > 0 ? 'Sisa tagihan' : 'Status'}</span>
            <span className="text-[22px] font-bold text-slate-900 dark:text-white">
              {sisa > 0 ? formatRp(sisa) : 'LUNAS'}
            </span>
          </div>
        </div>

        <p className="mt-6 text-center text-[13px] text-slate-500 dark:text-slate-400">
          Terima kasih sudah servis di ServiceGo. Simpan struk ini sebagai bukti pembayaran.
        </p>
      </article>
    </div>
  );
}
