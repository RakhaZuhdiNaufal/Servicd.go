'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import { CalendarDays, Check, ChevronLeft, Loader2, MapPin, Phone, Star, UserRound } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { supabase } from '@/lib/supabase-client';
import { StatusBadge } from '@/components/status-badge';
import { Plate } from '@/components/customer/plate';
import { ErrorState, SkeletonBlock } from '@/components/customer/states';
import { bookingCode, formatDate, formatRp, formatTime } from '@/lib/format';
import { WorkshopFront } from '@/components/illustrations/workshop';

type BookingStatus = 'menunggu' | 'diproses' | 'selesai' | 'dibatalkan';

// Bentuk data dari GET /api/v1/bookings/[id].
interface Booking {
  id: string;
  status: BookingStatus;
  scheduled_at: string;
  complaint_notes: string | null;
  estimated_cost: number | string;
  final_cost: number | string | null;
  vehicle: { plate_number: string; brand: string; model: string; year?: number; vehicle_type: string };
  booking_services: Array<{ price_at_booking?: number | string; service: { name: string; price?: number | string } }>;
  mechanic: { full_name: string; specialty: string } | null;
  branch: { name: string; address: string; phone: string } | null;
  status_history: Array<{ status: BookingStatus; changed_at: string; note: string | null }>;
  photos?: Array<{ id: string; photo_url: string; stage: 'checkin' | 'checkout'; caption: string | null }>;
  review: { rating: number; comment: string | null } | null;
}

const PROGRESS: Array<{ status: BookingStatus; label: string }> = [
  { status: 'menunggu', label: 'Diterima' },
  { status: 'diproses', label: 'Dikerjakan' },
  { status: 'selesai', label: 'Siap diambil' }
];

const HISTORY_LABEL: Record<BookingStatus, string> = {
  menunggu: 'Booking dibuat',
  diproses: 'Mulai dikerjakan',
  selesai: 'Selesai, siap diambil',
  dibatalkan: 'Booking dibatalkan'
};

const HISTORY_DOT: Record<BookingStatus, string> = {
  menunggu: 'bg-amber-500',
  diproses: 'bg-blue-600',
  selesai: 'bg-green-600',
  dibatalkan: 'bg-red-600'
};

const PHOTO_STAGE: Record<'checkin' | 'checkout', string> = {
  checkin: 'Saat kendaraan datang',
  checkout: 'Saat servis selesai'
};

const RATING_TEXT = ['', 'Kurang sekali', 'Kurang', 'Cukup', 'Bagus', 'Bagus sekali'];

/** Nomor HP Indonesia (08.. / 628..) diubah ke format wa.me; telepon rumah/kantor tidak punya WhatsApp. */
function waNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('08')) return `62${digits.slice(1)}`;
  if (digits.startsWith('628')) return digits;
  return null;
}

function headline(b: Booking) {
  const kind = b.vehicle.vehicle_type?.toLowerCase() === 'motor' ? 'Motor' : 'Mobil';
  const where = b.branch ? ` di ${b.branch.name}` : '';
  switch (b.status) {
    case 'menunggu':
      return `Booking kamu menunggu konfirmasi bengkel`;
    case 'diproses':
      return `${kind} kamu sedang dikerjakan${where}`;
    case 'selesai':
      return `${kind} kamu sudah selesai diservis`;
    case 'dibatalkan':
      return 'Booking ini dibatalkan';
  }
}

function nextStep(b: Booking): string {
  const when = `${formatDate(b.scheduled_at, { weekday: 'long', day: 'numeric', month: 'long' })}, pukul ${formatTime(b.scheduled_at)}`;
  const where = b.branch ? b.branch.name : 'bengkel';
  switch (b.status) {
    case 'menunggu':
      return `Datang ke ${where} pada ${when}. Status di halaman ini berubah otomatis saat bengkel mulai mengerjakan.`;
    case 'diproses':
      return 'Mekanik sedang bekerja. Halaman ini diperbarui otomatis begitu servis selesai.';
    case 'selesai':
      return b.review
        ? `Kendaraan bisa diambil di ${where}. Terima kasih sudah memberi ulasan.`
        : `Kendaraan bisa diambil di ${where}. Ceritakan pengalaman servismu lewat ulasan di bawah.`;
    case 'dibatalkan':
      return 'Kalau masih perlu servis, kamu bisa buat booking baru kapan saja.';
  }
}

function Card({ title, children, id, className }: { title: string; children: React.ReactNode; id?: string; className?: string }) {
  const hid = `${id ?? title.replace(/\W+/g, '-').toLowerCase()}-judul`;
  return (
    <section
      id={id}
      aria-labelledby={hid}
      className={clsx(
        'scroll-mt-24 rounded-[20px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-7',
        className
      )}
    >
      <h2 id={hid} className="mb-5 text-[20px] font-extrabold tracking-[-0.01em] text-slate-900 dark:text-white sm:text-[22px]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Memuat detail booking">
      <SkeletonBlock className="h-5 w-32" />
      <SkeletonBlock className="h-72 w-full rounded-[28px]" />
      <div className="grid gap-6 lg:grid-cols-3">
        <SkeletonBlock className="h-64 rounded-[20px] lg:col-span-2" />
        <SkeletonBlock className="h-48 rounded-[20px]" />
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/bookings"
      className="-ml-2 inline-flex min-h-[44px] items-center gap-1 rounded-ctl px-2 text-sm font-semibold text-primary-700 hover:underline dark:text-primary-100"
    >
      <ChevronLeft className="h-4 w-4" aria-hidden />
      Riwayat booking
    </Link>
  );
}

function ReviewForm({ bookingId }: { bookingId: string }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const reviewMutation = useMutation({
    mutationFn: () =>
      fetcher(`/bookings/${bookingId}/review`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment: comment.trim() || null })
      }),
    onSuccess: () => {
      toast.success('Ulasan terkirim. Terima kasih!');
      qc.invalidateQueries({ queryKey: ['booking', bookingId] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (rating > 0) reviewMutation.mutate();
      }}
      className="space-y-4"
    >
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Nilai servisnya</legend>
        <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label="Nilai 1 sampai 5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} dari 5, ${RATING_TEXT[n]}`}
              onClick={() => setRating(n)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-ctl transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Star
                className={clsx(
                  'h-7 w-7',
                  n <= rating ? 'fill-amber-400 text-amber-500' : 'text-slate-500 dark:text-slate-400'
                )}
                aria-hidden
              />
            </button>
          ))}
          <span className="ml-2 text-sm text-slate-600 dark:text-slate-400" aria-live="polite">
            {rating ? RATING_TEXT[rating] : 'Pilih bintang'}
          </span>
        </div>
      </fieldset>
      <div className="space-y-1.5">
        <label htmlFor="review-comment" className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Komentar <span className="font-normal text-slate-600 dark:text-slate-400">(opsional)</span>
        </label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Misal: pengerjaan cepat, penjelasan mekaniknya jelas"
          className="w-full resize-none rounded-ctl border border-slate-300 bg-white px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-500 transition-colors hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>
      <button
        type="submit"
        disabled={rating === 0 || reviewMutation.isPending}
        className="inline-flex min-h-[48px] items-center gap-2 rounded-ctl bg-primary-600 px-6 text-[15px] font-bold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-600 dark:disabled:bg-slate-800 dark:disabled:text-slate-400"
      >
        {reviewMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {reviewMutation.isPending ? 'Mengirim...' : 'Kirim ulasan'}
      </button>
    </form>
  );
}

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();

  const { data: booking, isLoading, isError, error, refetch } = useQuery<Booking>({
    queryKey: ['booking', id],
    queryFn: () => fetcher(`/bookings/${id}`),
    // Cadangan kalau Realtime tidak tersambung: cek ulang tiap 30 detik selama booking masih berjalan.
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === 'menunggu' || s === 'diproses' ? 30_000 : false;
    }
  });

  // Supabase Realtime: dengarkan perubahan baris booking ini lalu ambil ulang datanya.
  useEffect(() => {
    const channel = supabase
      .channel(`booking-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${id}` },
        () => {
          qc.invalidateQueries({ queryKey: ['booking', id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, qc]);

  if (isLoading) return <DetailSkeleton />;

  if (isError || !booking) {
    return (
      <div className="space-y-6">
        <BackLink />
        <ErrorState
          title="Detail booking belum bisa dimuat"
          message={(error as Error)?.message ?? 'Booking tidak ditemukan.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const cancelled = booking.status === 'dibatalkan';
  const currentIdx = PROGRESS.findIndex((p) => p.status === booking.status);
  const photos = booking.photos ?? [];
  const wa = booking.branch ? waNumber(booking.branch.phone) : null;
  const tel = booking.branch?.phone.replace(/[^0-9+]/g, '');
  const total = booking.final_cost ?? booking.estimated_cost;

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="space-y-3">
        <BackLink />

        {/* Fokus halaman: status sekarang dan langkah berikutnya. */}
        <section
          aria-labelledby="status-sekarang"
          className="overflow-hidden rounded-[28px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="space-y-5 p-6 sm:p-9">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={booking.status} />
              <span className="font-mono text-[13px] text-slate-600 dark:text-slate-400">{bookingCode(booking.id)}</span>
            </div>
            <h1
              id="status-sekarang"
              className="max-w-3xl text-[30px] font-extrabold leading-[1.1] tracking-[-0.015em] text-slate-900 dark:text-white sm:text-[40px]"
            >
              {headline(booking)}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px] text-slate-600 dark:text-slate-400">
              <Plate number={booking.vehicle.plate_number} size="lg" />
              <span className="font-semibold capitalize text-slate-900 dark:text-white">
                {booking.vehicle.brand} {booking.vehicle.model}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-4 w-4" aria-hidden />
                {formatDate(booking.scheduled_at)}, {formatTime(booking.scheduled_at)}
              </span>
            </div>

            {!cancelled && (
              <ol className="grid max-w-2xl grid-cols-3 gap-2.5 pt-2" aria-label="Tahap servis">
                {PROGRESS.map((step, i) => {
                  const done = i <= currentIdx;
                  const now = i === currentIdx;
                  return (
                    <li key={step.status} className="space-y-2" aria-current={now ? 'step' : undefined}>
                      <span
                        className={clsx(
                          'block h-2 rounded',
                          done ? 'bg-primary-600 dark:bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'
                        )}
                        aria-hidden
                      />
                      <span
                        className={clsx(
                          'flex items-center gap-1 text-[13px] sm:text-[15px]',
                          now
                            ? 'font-bold text-slate-900 dark:text-white'
                            : done
                            ? 'text-slate-700 dark:text-slate-300'
                            : 'text-slate-600 dark:text-slate-400'
                        )}
                      >
                        {done && !now && <Check className="h-3.5 w-3.5" aria-hidden />}
                        {step.label}
                        {now && <span className="sr-only"> (sekarang)</span>}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {/* Panel gelap: jeda ritme halaman, berisi langkah berikutnya dan aksinya. */}
          <div className="flex flex-col gap-4 bg-slate-900 p-6 text-white dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between sm:px-9 sm:py-7">
            <div className="max-w-2xl space-y-1">
              <p className="text-[15px] font-bold text-blue-300">Langkah berikutnya</p>
              <p className="text-[15px] leading-relaxed text-slate-200">{nextStep(booking)}</p>
            </div>
            {booking.status === 'selesai' && !booking.review && (
              <a
                href="#ulasan"
                className="inline-flex min-h-[52px] shrink-0 items-center justify-center self-start rounded-ctl bg-white px-6 text-[17px] font-bold text-slate-900 transition-colors hover:bg-slate-100 sm:self-auto"
              >
                Tulis ulasan
              </a>
            )}
            {cancelled && (
              <Link
                href="/booking/new"
                className="inline-flex min-h-[52px] shrink-0 items-center justify-center self-start rounded-ctl bg-white px-6 text-[17px] font-bold text-slate-900 transition-colors hover:bg-slate-100 sm:self-auto"
              >
                Buat booking baru
              </Link>
            )}
            {(booking.status === 'menunggu' || booking.status === 'diproses') && tel && (
              <a
                href={`tel:${tel}`}
                className="inline-flex min-h-[52px] shrink-0 items-center justify-center gap-2 self-start rounded-ctl border border-slate-600 px-6 text-[17px] font-semibold text-white transition-colors hover:bg-slate-800 sm:self-auto"
              >
                <Phone className="h-4 w-4" aria-hidden />
                Telepon bengkel
              </a>
            )}
          </div>
        </section>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Rincian servis">
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {booking.booking_services.map(({ service, price_at_booking }, i) => (
                <li key={i} className="flex items-start justify-between gap-3 py-3.5 text-[15px] first:pt-0">
                  <span className="font-semibold text-slate-900 dark:text-white">{service.name}</span>
                  {(price_at_booking ?? service.price) != null && (
                    <span className="shrink-0 text-slate-700 dark:text-slate-300">
                      {formatRp(price_at_booking ?? service.price)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-3 space-y-1.5 border-t border-slate-200 pt-4 dark:border-slate-800">
              {(() => {
                // Selisih antara jumlah harga layanan dan estimasi = potongan kode promo (dicatat di riwayat status).
                const subtotal = booking.booking_services.reduce(
                  (sum, bs) => sum + Number(bs.price_at_booking ?? bs.service.price ?? 0),
                  0
                );
                const discount = subtotal - Number(booking.estimated_cost);
                return discount > 0 ? (
                  <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                    <span>Diskon kode promo</span>
                    <span className="text-emerald-700 dark:text-emerald-300">-{formatRp(discount)}</span>
                  </div>
                ) : null;
              })()}
              {booking.final_cost != null && (
                <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                  <span>Estimasi awal</span>
                  <span>{formatRp(booking.estimated_cost)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold text-slate-900 dark:text-white">
                  {booking.final_cost != null ? 'Biaya akhir' : 'Estimasi biaya'}
                </span>
                <span className="text-[28px] font-extrabold tracking-[-0.015em] text-slate-900 dark:text-white">{formatRp(total)}</span>
              </div>
            </div>
            {booking.complaint_notes && (
              <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60 sm:p-5">
                <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Keluhan yang kamu tulis</p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{booking.complaint_notes}</p>
              </div>
            )}
          </Card>

          {!cancelled && (
            <Card title="Foto kondisi kendaraan">
              {photos.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Belum ada foto. Bengkel memotret kondisi kendaraan saat datang dan saat selesai, fotonya muncul di sini.
                </p>
              ) : (
                <div className="space-y-5">
                  {(['checkin', 'checkout'] as const).map((stage) => {
                    const list = photos.filter((p) => p.stage === stage);
                    if (list.length === 0) return null;
                    return (
                      <div key={stage} className="space-y-2">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{PHOTO_STAGE[stage]}</h3>
                        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {list.map((p) => (
                            <li key={p.id}>
                              <a
                                href={p.photo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block overflow-hidden rounded-2xl border border-slate-200 transition-colors hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-500"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={p.photo_url}
                                  alt={p.caption ?? PHOTO_STAGE[stage]}
                                  loading="lazy"
                                  className="aspect-[4/3] w-full bg-slate-100 object-cover dark:bg-slate-800"
                                />
                                {p.caption && (
                                  <span className="block px-3 py-2 text-[13px] text-slate-700 dark:text-slate-300">
                                    {p.caption}
                                  </span>
                                )}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          <Card title="Riwayat status">
            {booking.status_history.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">Belum ada perubahan status.</p>
            ) : (
              <ol className="relative space-y-5 border-l-2 border-slate-200 pl-6 dark:border-slate-700">
                {booking.status_history.map((h, i) => (
                  <li key={i} className="relative">
                    <span
                      className={clsx(
                        'absolute -left-[31px] top-1 h-3 w-3 rounded-full ring-4 ring-white dark:ring-slate-900',
                        HISTORY_DOT[h.status]
                      )}
                      aria-hidden
                    />
                    <p className="font-semibold text-slate-900 dark:text-white">{HISTORY_LABEL[h.status]}</p>
                    <p className="text-[13px] text-slate-600 dark:text-slate-400">
                      {formatDate(h.changed_at)}, {formatTime(h.changed_at)}
                    </p>
                    {h.note && <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{h.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Card>

          {booking.review ? (
            <Card title="Ulasan kamu" id="ulasan">
              <div className="flex items-center gap-1" aria-label={`Nilai ${booking.review.rating} dari 5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    aria-hidden
                    className={clsx(
                      'h-5 w-5',
                      n <= booking.review!.rating ? 'fill-amber-400 text-amber-500' : 'text-slate-300 dark:text-slate-600'
                    )}
                  />
                ))}
                <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">{RATING_TEXT[booking.review.rating]}</span>
              </div>
              {booking.review.comment && (
                <p className="mt-2 text-[15px] text-slate-700 dark:text-slate-300">{booking.review.comment}</p>
              )}
            </Card>
          ) : (
            booking.status === 'selesai' && (
              <Card title="Gimana servisnya?" id="ulasan">
                <ReviewForm bookingId={booking.id} />
              </Card>
            )
          )}
        </div>

        <div className="space-y-6">
          {booking.branch && (
            <section
              aria-labelledby="lokasi-judul"
              className="overflow-hidden rounded-[20px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="bg-primary-50 dark:bg-slate-800">
                <WorkshopFront decorative />
              </div>
              <div className="space-y-3 p-5 sm:p-6">
                <h2 id="lokasi-judul" className="text-[13px] font-semibold text-slate-600 dark:text-slate-400">
                  Lokasi bengkel
                </h2>
                <div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{booking.branch.name}</p>
                  <p className="mt-0.5 flex items-start gap-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {booking.branch.address}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 pt-1 text-sm">
                  {tel && (
                    <a
                      href={`tel:${tel}`}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-ctl border border-slate-300 px-3.5 font-semibold text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800"
                    >
                      <Phone className="h-4 w-4" aria-hidden />
                      <span className="font-mono text-[13px]">{booking.branch.phone}</span>
                    </a>
                  )}
                  {wa && (
                    <a
                      href={`https://wa.me/${wa}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] items-center rounded-ctl border border-slate-300 px-3.5 font-semibold text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800"
                    >
                      Chat WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </section>
          )}

          <Card title="Mekanik">
            {booking.mechanic ? (
              <div className="flex items-center gap-3">
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[15px] font-bold text-primary-700 dark:bg-primary-900 dark:text-primary-100"
                  aria-hidden
                >
                  {booking.mechanic.full_name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-[17px] font-bold text-slate-900 dark:text-white">{booking.mechanic.full_name}</p>
                  <p className="text-[13px] text-slate-600 dark:text-slate-400">{booking.mechanic.specialty}</p>
                </div>
              </div>
            ) : (
              <p className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                <UserRound className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {cancelled ? 'Tidak ada mekanik untuk booking ini.' : 'Mekanik ditentukan bengkel setelah booking dikonfirmasi.'}
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
