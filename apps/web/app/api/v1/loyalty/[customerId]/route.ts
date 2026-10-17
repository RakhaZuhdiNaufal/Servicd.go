import { NextRequest } from 'next/server';
import { prisma, BookingStatus } from '@servicego/database';
import { apiSuccess, apiError } from '@/lib/response';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params;
    const user = await getAuthenticatedUser(request);
    if (!user || (!user.profileId && !user.authId)) {
      return apiError('Profil pengguna tidak ditemukan', 404);
    }

    // Resolusi target customer ID
    let targetProfileId = customerId;
    if (customerId === 'me' || customerId === user.profileId || customerId === user.authId) {
      targetProfileId = user.profileId;
      if (!targetProfileId && user.authId) {
        const p = await prisma.profile.findUnique({
          where: { auth_user_id: user.authId }
        });
        if (p) targetProfileId = p.id;
      }
    }

    if (!targetProfileId) {
      return apiError('ID pelanggan tidak valid', 400);
    }

    // Otorisasi: Customer biasa hanya bisa melihat loyalty miliknya sendiri
    if (user.role !== 'admin' && targetProfileId !== user.profileId) {
      return apiError('Akses ditolak: Anda tidak berhak melihat data loyalty pelanggan lain', 403);
    }

    const profile = await prisma.profile.findUnique({
      where: { id: targetProfileId },
      include: {
        bookings: {
          where: { status: BookingStatus.selesai },
          select: {
            id: true,
            estimated_cost: true,
            final_cost: true,
            created_at: true
          }
        }
      }
    });

    if (!profile) {
      return apiError('Pelanggan tidak ditemukan', 404);
    }

    const completedBookings = profile.bookings;
    const totalSpent = completedBookings.reduce((sum, b) => {
      const cost = b.final_cost ? Number(b.final_cost) : Number(b.estimated_cost);
      return sum + cost;
    }, 0);

    // Poin: 1 poin per Rp 10.000 dari servis yang sudah selesai. Tidak ada poin dasar/bonus karangan.
    // Catatan: belum ada fitur tukar poin, jadi API tidak menjanjikan nilai tukar atau benefit apa pun.
    const points = Math.floor(totalSpent / 10000);

    // Tier dihitung dari riwayat servis selesai (aturan lama dipertahankan).
    const bookingCount = completedBookings.length;
    let tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' = 'Bronze';
    let nextTier = 'Silver';
    let nextTierProgress = Math.min(100, Math.round((bookingCount / 2) * 100));

    if (bookingCount >= 10 || totalSpent >= 2500000) {
      tier = 'Platinum';
      nextTier = 'Maksimal';
      nextTierProgress = 100;
    } else if (bookingCount >= 5 || totalSpent >= 1000000) {
      tier = 'Gold';
      nextTier = 'Platinum';
      nextTierProgress = Math.min(100, Math.round(((bookingCount - 5) / 5) * 100));
    } else if (bookingCount >= 2 || totalSpent >= 400000) {
      tier = 'Silver';
      nextTier = 'Gold';
      nextTierProgress = Math.min(100, Math.round(((bookingCount - 2) / 3) * 100));
    }

    return apiSuccess({
      customer_id: profile.id,
      full_name: profile.full_name,
      points,
      points_redeemable: false,
      tier,
      total_bookings_completed: bookingCount,
      total_spent: totalSpent,
      next_tier: nextTier,
      next_tier_progress: nextTierProgress
    }, 'Data loyalty pelanggan berhasil diambil');
  } catch (error: any) {
    return apiError(error.message || 'Gagal mengambil data loyalty pelanggan', 500);
  }
}
