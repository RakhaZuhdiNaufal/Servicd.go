import { NextRequest } from 'next/server';
import { prisma } from '@servicego/database';
import { apiSuccess, apiError, apiCatch } from '@/lib/response';
import { getAuthenticatedUser } from '@/lib/auth';

// GET /api/v1/admin/bookings/:id
// Detail satu booking untuk panel admin: pelanggan, kendaraan, cabang, layanan, mekanik, foto, dan riwayat status.
// Peran admin sudah diperiksa middleware untuk semua /api/v1/admin/**; dicek ulang di sini sebagai pengaman.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return apiError('Unauthorized', 401);
    }
    if (user.role !== 'admin') {
      return apiError('Forbidden: Akses ditolak, memerlukan peran admin', 403);
    }

    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return apiError('Booking tidak ditemukan', 404);
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            full_name: true,
            phone: true,
            email: true
          }
        },
        vehicle: true,
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true
          }
        },
        mechanic: {
          select: {
            id: true,
            full_name: true,
            specialty: true,
            is_active: true
          }
        },
        photos: {
          select: {
            id: true,
            photo_url: true,
            stage: true,
            caption: true,
            uploaded_at: true
          },
          orderBy: { uploaded_at: 'asc' }
        },
        booking_services: {
          include: {
            service: true
          }
        },
        status_history: {
          select: {
            id: true,
            status: true,
            note: true,
            changed_at: true,
            changer: {
              select: {
                id: true,
                full_name: true,
                role: true
              }
            }
          },
          orderBy: { changed_at: 'desc' }
        },
        review: {
          select: {
            rating: true,
            comment: true,
            created_at: true
          }
        }
      }
    });

    if (!booking) {
      return apiError('Booking tidak ditemukan', 404);
    }

    return apiSuccess(booking, 'Detail booking berhasil diambil');
  } catch (error: any) {
    return apiCatch(error, 'Gagal mengambil detail booking');
  }
}
