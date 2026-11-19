import { NextRequest } from 'next/server';
import { prisma } from '@servicego/database';
import { apiSuccess, apiError, apiCatch } from '@/lib/response';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(
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
      include: {
        customer: {
          select: {
            id: true,
            full_name: true,
            phone: true,
            email: true,
            avatar_url: true
          }
        },
        vehicle: true,
        branch: true,
        mechanic: true,
        booking_services: {
          include: {
            service: true
          }
        },
        status_history: {
          include: {
            changer: {
              select: {
                id: true,
                full_name: true,
                role: true
              }
            }
          },
          orderBy: { changed_at: 'asc' }
        },
        photos: {
          orderBy: { uploaded_at: 'asc' }
        },
        review: true,
        payments: true
      }
    });

    if (!booking) {
      return apiError('Booking tidak ditemukan', 404);
    }

    // Otorisasi: Customer hanya bisa melihat booking miliknya sendiri
    if (user.role !== 'admin' && booking.customer_id !== user.profileId) {
      return apiError('Akses ditolak: Anda tidak berhak melihat data booking ini', 403);
    }

    return apiSuccess(booking, 'Detail booking berhasil diambil');
  } catch (error: any) {
    return apiCatch(error, 'Gagal mengambil detail booking');
  }
}
