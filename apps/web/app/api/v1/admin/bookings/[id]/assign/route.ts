import { NextRequest } from 'next/server';
import { prisma, BookingStatus } from '@servicego/database';
import { assignMechanicSchema } from '@servicego/shared';
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
      where: { id },
      include: {
        mechanic: { select: { id: true, full_name: true } }
      }
    });

    if (!booking) {
      return apiError('Booking tidak ditemukan', 404);
    }

    const body = await request.json();
    const parsed = assignMechanicSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Validasi gagal', 422, parsed.error.format());
    }

    const { mechanic_id } = parsed.data;

    // Verifikasi mekanik ada dan aktif
    const mechanic = await prisma.mechanic.findUnique({
      where: { id: mechanic_id }
    });

    if (!mechanic) {
      return apiError('Mekanik tidak ditemukan', 404);
    }

    if (!mechanic.is_active) {
      return apiError('Mekanik yang dipilih sedang tidak aktif', 400);
    }

    // Cek apakah mekanik sudah memiliki jadwal pengerjaan aktif di slot waktu yang sama
    const conflict = await prisma.booking.findFirst({
      where: {
        id: { not: id },
        mechanic_id,
        scheduled_at: booking.scheduled_at,
        status: { not: BookingStatus.dibatalkan }
      }
    });

    if (conflict) {
      return apiError('Mekanik ini sudah memiliki jadwal servis aktif pada jam tersebut', 409);
    }

    if (booking.mechanic_id === mechanic_id) {
      return apiError(`${mechanic.full_name} sudah ditugaskan ke booking ini`, 409);
    }

    const previous = booking.mechanic;
    const note = previous
      ? `Mekanik diganti: ${previous.full_name} ke ${mechanic.full_name}`
      : `Mekanik ditugaskan: ${mechanic.full_name}`;

    // Update mekanik + catat di riwayat status dalam satu transaksi (status booking tidak berubah)
    const updated = await prisma.$transaction(async (tx) => {
      const updatedBooking = await tx.booking.update({
        where: { id },
        data: { mechanic_id },
        include: {
          mechanic: true
        }
      });

      await tx.bookingStatusHistory.create({
        data: {
          booking_id: id,
          status: booking.status,
          changed_by: user.profileId,
          note
        }
      });

      return updatedBooking;
    });

    return apiSuccess(updated, `Mekanik ${mechanic.full_name} berhasil ditugaskan ke booking`);
  } catch (error: any) {
    return apiError(error.message || 'Gagal menugaskan mekanik', 500);
  }
}
