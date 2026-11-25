import { NextRequest } from 'next/server';
import { prisma, BookingStatus, NotificationChannel, PaymentType, PaymentStatus } from '@servicego/database';
import { updateBookingStatusSchema, bookingStatusBlockReason } from '@servicego/shared';
import { apiSuccess, apiError, apiCatch, HttpError } from '@/lib/response';
import { getAuthenticatedUser } from '@/lib/auth';
import { formatRp } from '@/lib/format';

// Kalimat notifikasi pelanggan per status baru.
const STATUS_MESSAGE: Record<BookingStatus, string> = {
  menunggu: 'Booking kamu sedang menunggu konfirmasi bengkel.',
  dikonfirmasi: 'Booking kamu sudah dikonfirmasi bengkel. Datang sesuai jadwal ya.',
  diproses: 'Kendaraan kamu sedang dikerjakan mekanik.',
  selesai: 'Servis kendaraan kamu sudah selesai dan siap diambil.',
  dibatalkan: 'Booking kamu dibatalkan oleh bengkel.'
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser(request);
    if (!user || !user.profileId) {
      return apiError('Profil admin tidak ditemukan', 404);
    }

    const booking = await prisma.booking.findUnique({
      where: { id }
    });

    if (!booking) {
      return apiError('Booking tidak ditemukan', 404);
    }

    const body = await request.json();
    const parsed = updateBookingStatusSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Validasi gagal', 422, parsed.error.format());
    }

    const { status, note } = parsed.data;

    const blocked = bookingStatusBlockReason(booking.status, status, booking.scheduled_at);
    if (blocked) {
      return apiError(blocked, 409);
    }

    // Cek apakah booking memiliki pembayaran DP (Uang Hangat) yang sudah lunas/dibayar
    const dpPayments = await prisma.payment.findMany({
      where: {
        booking_id: id,
        payment_type: PaymentType.dp,
        status: PaymentStatus.paid
      }
    });
    const totalDpPaid = dpPayments.reduce((acc, p) => acc + Number(p.amount), 0);
    const hasDpToRefund = status === BookingStatus.dibatalkan && totalDpPaid > 0;

    // Jalankan dalam transaksi: Update booking + Insert row baru ke BookingStatusHistory
    const updated = await prisma.$transaction(async (tx) => {
      // Update bersyarat status lama: kalau admin lain sudah mengubahnya duluan, batal (tidak saling timpa).
      const { count } = await tx.booking.updateMany({
        where: { id, status: booking.status },
        data: {
          status: status as BookingStatus,
          final_cost: status === BookingStatus.selesai && !booking.final_cost ? booking.estimated_cost : undefined,
          // Booking batal melepas mekaniknya, supaya jam itu bisa ditugaskan ke booking lain
          // (constraint unik mechanic_id + scheduled_at).
          ...(status === BookingStatus.dibatalkan ? { mechanic_id: null } : {})
        }
      });
      if (count === 0) {
        throw new HttpError('Status booking baru saja diubah oleh admin lain. Muat ulang lalu coba lagi.', 409);
      }
      const updatedBooking = await tx.booking.findUniqueOrThrow({ where: { id } });

      const historyNote = hasDpToRefund
        ? (note ? `${note} · ` : '') +
          `[REFUND DP DIBUTUHKAN]: Booking memiliki DP (Uang Hangat) sebesar ${formatRp(totalDpPaid)} yang wajib dikembalikan ke pelanggan karena dibatalkan oleh pihak bengkel.`
        : (note ?? `Status diubah menjadi ${status}`);

      // Simpan riwayat perubahan status (audit trail)
      await tx.bookingStatusHistory.create({
        data: {
          booking_id: id,
          status: status as BookingStatus,
          changed_by: user.profileId,
          note: historyNote
        }
      });

      const notifBody = hasDpToRefund
        ? `Booking kamu dibatalkan oleh pihak bengkel. Pengembalian dana DP (Uang Hangat) sebesar ${formatRp(totalDpPaid)} sedang diproses untuk dikembalikan ke kamu.${note ? ` Catatan: ${note}` : ''}`
        : `${STATUS_MESSAGE[status]}${note ? ` Catatan: ${note}` : ''}`;

      // Buat notifikasi otomatis untuk pelanggan (PRD §8.3 & §10.2)
      await tx.notification.create({
        data: {
          user_id: booking.customer_id,
          title: hasDpToRefund ? 'Booking Dibatalkan & Refund DP Diproses' : 'Pembaruan Status Booking',
          body: notifBody,
          sent_channel: NotificationChannel.push
        }
      });

      return updatedBooking;
    });

    return apiSuccess(updated, `Status booking berhasil diubah menjadi ${status}`);
  } catch (error: any) {
    return apiCatch(error, 'Gagal mengubah status booking');
  }
}
