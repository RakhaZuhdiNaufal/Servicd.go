'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { ChevronLeft, Printer } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { ErrorState, SkeletonBlock } from '@/components/customer/states';
import { bookingCode, formatDate, formatRp, formatTime } from '@/lib/format';
import { btnSecondary } from '@/components/customer/ui';
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
    <div className="flex justify-between gap-4">
      <span className="shrink-0 text-slate-600">{label}</span>
      <span className="min-w-0 text-right">{children}</span>
    </div>
  );
}

/** Garis putus-putus antar blok, seperti sobekan baris pada nota kasir. */
function Pemisah() {
  return <div aria-hidden className="my-3 border-t border-dashed border-slate-400" />;
}

/**
 * Kertas digunting bergerigi di tepi atas & bawah.
 *
 * Dipotong dengan mask, bukan ditimpa gradien: dengan mask, yang hilang benar-benar
 * kertasnya, jadi tetap terlihat tersobek di atas latar apa pun (termasuk saat dicetak).
 */
const GIGI = 10; // tinggi gigi, px
const kertasSobek = {
  WebkitMaskImage: `
    conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg),
    conic-gradient(from 135deg at top, #0000, #000 1deg 89deg, #0000 90deg),
    linear-gradient(#000 0 0)
  `,
  WebkitMaskSize: `${GIGI * 2}px ${GIGI}px, ${GIGI * 2}px ${GIGI}px, 100% calc(100% - ${GIGI * 2}px)`,
  WebkitMaskPosition: 'bottom, top, center',
  WebkitMaskRepeat: 'repeat-x, repeat-x, no-repeat',
  maskImage: `
    conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg),
    conic-gradient(from 135deg at top, #0000, #000 1deg 89deg, #0000 90deg),
    linear-gradient(#000 0 0)
  `,
  maskSize: `${GIGI * 2}px ${GIGI}px, ${GIGI * 2}px ${GIGI}px, 100% calc(100% - ${GIGI * 2}px)`,
  maskPosition: 'bottom, top, center',
  maskRepeat: 'repeat-x, repeat-x, no-repeat'
} as const;

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

      {/* Kertas struk: selalu putih-hitam & font mono, termasuk di mode gelap — nota kasir
          memang begitu, dan ini juga yang tercetak di kertas. */}
      <article
        style={kertasSobek}
        className="relative bg-white px-6 pb-9 pt-9 font-mono text-[13px] leading-relaxed text-slate-900"
      >
        <header className="text-center">
          <p className="text-[17px] font-bold uppercase tracking-[0.18em]">ServiceGo</p>
          {booking.branch && (
            <div className="mt-1.5 space-y-0.5 text-[12px] text-slate-600">
              <p>{booking.branch.name}</p>
              <p>{booking.branch.address}</p>
              <p>Telp {booking.branch.phone}</p>
            </div>
          )}
        </header>

        <Pemisah />

        <div className="space-y-0.5">
          <Baris label="No. Struk">{bookingCode(booking.id)}</Baris>
          {booking.customer?.full_name && <Baris label="Pelanggan">{booking.customer.full_name}</Baris>}
          <Baris label="Kendaraan">{booking.vehicle.plate_number}</Baris>
          <Baris label="">
            <span className="capitalize text-slate-600">
              {booking.vehicle.brand} {booking.vehicle.model}
            </span>
          </Baris>
          <Baris label="Tanggal">
            {formatDate(booking.scheduled_at)} {formatTime(booking.scheduled_at)}
          </Baris>
        </div>

        <Pemisah />

        <div className="space-y-1.5">
          {booking.booking_services.map((bs, i) => (
            <div key={i}>
              <p className="uppercase">{bs.service.name}</p>
              <div className="flex justify-between gap-4 text-slate-600">
                <span>1 x</span>
                <span>{formatRp(bs.price_at_booking ?? bs.service.price ?? 0)}</span>
              </div>
            </div>
          ))}
        </div>

        <Pemisah />

        <div className="flex justify-between gap-4 text-[15px] font-bold">
          <span>TOTAL</span>
          <span>{formatRp(total)}</span>
        </div>

        <Pemisah />

        <div className="space-y-0.5">
          {payments.length === 0 ? (
            <p className="text-center text-slate-600">- Belum ada pembayaran -</p>
          ) : (
            payments.map((p) => (
              <div key={p.id}>
                <Baris label={PAYMENT_METHOD[p.method]}>{formatRp(p.amount)}</Baris>
                <p className="text-[11px] uppercase text-slate-500">
                  {PAYMENT_TYPE[p.payment_type]} · {PAYMENT_STATUS[p.status]}
                  {p.paid_at ? ` · ${formatDate(p.paid_at)}` : ''}
                </p>
              </div>
            ))
          )}
          <Baris label="Dibayar">{formatRp(dibayar)}</Baris>
          <Baris label="Kembali">{formatRp(0)}</Baris>
        </div>

        <Pemisah />

        <p className="text-center text-[22px] font-bold tracking-[0.2em]">
          {sisa > 0 ? `SISA ${formatRp(sisa)}` : 'LUNAS'}
        </p>

        <Pemisah />

        <div className="space-y-0.5 text-center text-[11px] uppercase tracking-wider text-slate-500">
          <p>Terima kasih</p>
          <p>Simpan struk ini sebagai bukti</p>
        </div>
      </article>
    </div>
  );
}
