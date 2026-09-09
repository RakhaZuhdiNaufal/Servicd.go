import { NextRequest } from 'next/server';
import { prisma, BookingStatus, NotificationChannel } from '@servicego/database';
import { updateBookingStatusSchema } from '@servicego/shared';
import { apiSuccess, apiError } from '@/lib/response';
import { getAuthenticatedUser } from '@/lib/auth';

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

    // Jalankan dalam transaksi: Update booking + Insert row baru ke BookingStatusHistory
    const updated = await prisma.$transaction(async (tx) => {
      const updatedBooking = await tx.booking.update({
        where: { id },
        data: {
          status: status as BookingStatus,
          final_cost: status === BookingStatus.selesai && !booking.final_cost ? booking.estimated_cost : undefined
        }
      });

      // Simpan riwayat perubahan status (audit trail)
      await tx.bookingStatusHistory.create({
        data: {
          booking_id: id,
          status: status as BookingStatus,
          changed_by: user.profileId,
          note: note ?? `Status diubah menjadi ${status}`
        }
      });

      // Buat notifikasi otomatis untuk pelanggan (PRD §8.3 & §10.2)
      await tx.notification.create({
        data: {
          user_id: booking.customer_id,
          title: 'Pembaruan Status Booking',
          body: `Status booking kendaraan Anda kini: ${status.toUpperCase()}.${note ? ` Catatan: ${note}` : ''}`,
          sent_channel: NotificationChannel.push
        }
      });

      return updatedBooking;
    });

    return apiSuccess(updated, `Status booking berhasil diubah menjadi ${status}`);
  } catch (error: any) {
    return apiError(error.message || 'Gagal mengubah status booking', 500);
  }
}
