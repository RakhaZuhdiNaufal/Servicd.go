'use client';

import { use, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetcher } from '@/lib/fetcher';
import { supabase } from '@/lib/supabase-client';
import { StatusBadge } from '@/components/status-badge';
import { SkeletonText } from '@/components/skeletons';
import { clsx } from 'clsx';
import { CheckCircle, Clock, Wrench, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Booking {
  id: string;
  status: 'menunggu' | 'diproses' | 'selesai' | 'dibatalkan';
  scheduled_at: string;
  complaint_notes: string | null;
  estimated_cost: number;
  final_cost: number | null;
  vehicle: { plate_number: string; brand: string; model: string };
  booking_services: Array<{ service: { name: string } }>;
  mechanic: { full_name: string; specialty: string } | null;
  branch: { name: string; address: string; phone: string } | null;
  status_history: Array<{ status: string; changed_at: string; note: string | null }>;
  review: { rating: number; comment: string } | null;
}

const TIMELINE = [
  { status: 'menunggu', label: 'Diterima', icon: Clock },
  { status: 'diproses', label: 'Sedang Dikerjakan', icon: Wrench },
  { status: 'selesai', label: 'Selesai / Siap Diambil', icon: CheckCircle }
] as const;

const formatRp = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [ratingOpen, setRatingOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const { data: booking, isLoading } = useQuery<Booking>({
    queryKey: ['booking', id],
    queryFn: () => fetcher(`/bookings/${id}`)
  });

  // Supabase Realtime subscription — listen for booking row updates
  useEffect(() => {
    const channel = supabase
      .channel(`booking-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${id}` },
        () => {
          // Invalidate to refetch with updated data
          qc.invalidateQueries({ queryKey: ['booking', id] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, qc]);

  const reviewMutation = useMutation({
    mutationFn: () =>
      fetcher(`/bookings/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment: comment || null })
      }),
    onSuccess: () => {
      toast.success('Ulasan berhasil dikirim, terima kasih!');
      qc.invalidateQueries({ queryKey: ['booking', id] });
      setRatingOpen(false);
    },
    onError: (e: Error) => toast.error(e.message)
  });

  if (isLoading) return <div className="space-y-4"><SkeletonText lines={6} /></div>;
  if (!booking) return <p className="text-slate-400 text-center py-16">Booking tidak ditemukan</p>;

  const currentIdx = TIMELINE.findIndex((t) => t.status === booking.status);
  const isDone = booking.status === 'selesai';
  const hasReview = !!booking.review;

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-500 font-data">{booking.id.slice(0, 8).toUpperCase()}</p>
            <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
              {booking.vehicle.brand} {booking.vehicle.model}
            </p>
            <p className="text-sm font-data font-semibold text-slate-600 dark:text-slate-400">{booking.vehicle.plate_number}</p>
          </div>
          <StatusBadge status={booking.status} />
        </div>
        <div className="text-sm text-slate-500">
          {new Date(booking.scheduled_at).toLocaleString('id-ID', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })}
        </div>
        <div className="border-t border-slate-200 dark:border-slate-700 pt-3 text-sm">
          <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Layanan</p>
          {booking.booking_services.map(({ service }, i) => (
            <p key={i} className="text-slate-600 dark:text-slate-400">{service.name}</p>
          ))}
          <div className="flex justify-between mt-2 font-semibold">
            <span className="text-slate-700 dark:text-slate-300">Total</span>
            <span className="font-data text-primary-700">
              {formatRp(booking.final_cost ?? booking.estimated_cost)}
            </span>
          </div>
        </div>
      </div>

      {/* Realtime Timeline */}
      {booking.status !== 'dibatalkan' && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Status Servis</h2>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-200 dark:bg-slate-700" />
            <div
              className="absolute left-4 top-4 w-0.5 bg-primary-500 transition-all duration-700"
              style={{ height: `${(currentIdx / (TIMELINE.length - 1)) * 100}%` }}
            />
            <div className="space-y-6">
              {TIMELINE.map((step, i) => {
                const done = i <= currentIdx;
                const active = i === currentIdx;
                const Icon = step.icon;
                return (
                  <div key={step.status} className="flex items-start gap-4 relative">
                    <div className={clsx(
                      'h-8 w-8 rounded-full flex items-center justify-center shrink-0 border-2 z-10 transition-colors',
                      done
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-400'
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="pt-0.5">
                      <p className={clsx('font-medium text-sm', done ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400')}>
                        {step.label}
                      </p>
                      {active && (
                        <span className="inline-block mt-0.5 text-xs text-primary-600 font-medium animate-pulse">
                          • Saat ini
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mechanic info */}
      {booking.mechanic && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <h2 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Mekanik</h2>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{booking.mechanic.full_name}</p>
          <p className="text-xs text-slate-500">{booking.mechanic.specialty}</p>
        </div>
      )}

      {/* Branch info */}
      {booking.branch && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <h2 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Lokasi Bengkel</h2>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{booking.branch.name}</p>
          <p className="text-xs text-slate-500">{booking.branch.address}</p>
          <a
            href={`https://wa.me/${booking.branch.phone?.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-xs text-green-600 font-medium hover:underline"
          >
            Chat via WhatsApp →
          </a>
        </div>
      )}

      {/* Rating CTA */}
      {isDone && !hasReview && (
        <button
          onClick={() => setRatingOpen(true)}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent-500 hover:bg-accent-600 text-white font-semibold py-3 text-sm transition"
        >
          <Star className="h-4 w-4" />
          Beri Rating &amp; Ulasan
        </button>
      )}

      {/* Existing review */}
      {hasReview && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-2">
          <h2 className="font-semibold text-slate-700 dark:text-slate-300">Ulasan Anda</h2>
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={clsx('h-5 w-5', i < (booking.review?.rating ?? 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-300')}
              />
            ))}
          </div>
          {booking.review?.comment && (
            <p className="text-sm text-slate-600 dark:text-slate-400">{booking.review.comment}</p>
          )}
        </div>
      )}

      {/* Rating Dialog */}
      <Dialog open={ratingOpen} onOpenChange={setRatingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Beri Rating Servis</DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-4">
            <div className="flex justify-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <button key={i} onClick={() => setRating(i + 1)} aria-label={`Bintang ${i + 1}`}>
                  <Star
                    className={clsx(
                      'h-9 w-9 transition-colors',
                      i < rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300 hover:text-amber-300'
                    )}
                  />
                </button>
              ))}
            </div>
            <div className="space-y-1">
              <label htmlFor="review-comment" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Komentar (opsional)
              </label>
              <textarea
                id="review-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Bagaimana pengalaman servis Anda?"
                className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setRatingOpen(false)}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Nanti saja
            </button>
            <button
              onClick={() => reviewMutation.mutate()}
              disabled={reviewMutation.isPending}
              className="rounded-md bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 text-sm font-semibold transition disabled:opacity-50"
            >
              {reviewMutation.isPending ? 'Mengirim…' : 'Kirim Ulasan'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
