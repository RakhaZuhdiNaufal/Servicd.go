import { NextRequest } from 'next/server';
import { prisma } from '@servicego/database';
import { apiSuccess, apiError } from '@/lib/response';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || !user.profileId) {
      return apiError('Profil pengguna tidak ditemukan', 404);
    }

    const notifications = await prisma.notification.findMany({
      where: { user_id: user.profileId },
      orderBy: { created_at: 'desc' }
    });

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return apiSuccess(
      {
        unread_count: unreadCount,
        notifications
      },
      'Daftar notifikasi berhasil diambil'
    );
  } catch (error: any) {
    return apiError(error.message || 'Gagal mengambil notifikasi', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || !user.profileId) {
      return apiError('Profil pengguna tidak ditemukan', 404);
    }

    // Tandai semua notifikasi milik user sebagai sudah dibaca
    await prisma.notification.updateMany({
      where: {
        user_id: user.profileId,
        is_read: false
      },
      data: {
        is_read: true
      }
    });

    return apiSuccess(null, 'Semua notifikasi berhasil ditandai sebagai dibaca');
  } catch (error: any) {
    return apiError(error.message || 'Gagal memperbarui notifikasi', 500);
  }
}
