import { NextRequest } from 'next/server';
import { prisma, BookingStatus } from '@servicego/database';
import { createReviewSchema } from '@servicego/shared';
import { apiSuccess, apiError } from '@/lib/response';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser(request);
    if (!user || !user.profileId) {
      return apiError('Profil pengguna tidak ditemukan', 404);
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { review: true }
    });

    if (!booking) {
      return apiError('Booking tidak ditemukan', 404);
    }

    // Hanya bisa untuk booking milik sendiri
    if (booking.customer_id !== user.profileId) {
      return apiError('Akses ditolak: Anda bukan pemilik booking ini', 403);
    }

    // Hanya bisa untuk booking berstatus 'selesai'
    if (booking.status !== BookingStatus.selesai) {
      return apiError('Ulasan hanya dapat diberikan jika status booking sudah selesai', 400);
    }

    // Cek apakah ulasan sudah pernah dibuat
    if (booking.review) {
      return apiError('Ulasan untuk booking ini sudah pernah dikirimkan', 409);
    }

    const body = await request.json();
    const parsed = createReviewSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Validasi gagal', 422, parsed.error.format());
    }

    const review = await prisma.review.create({
      data: {
        booking_id: booking.id,
        rating: parsed.data.rating,
        comment: parsed.data.comment ?? null
      }
    });

    return apiSuccess(review, 'Ulasan berhasil dikirim', 201);
  } catch (error: any) {
    return apiError(error.message || 'Gagal mengirim ulasan', 500);
  }
}
