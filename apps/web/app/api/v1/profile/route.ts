import { NextRequest } from 'next/server';
import { prisma } from '@servicego/database';
import { apiSuccess, apiError, apiCatch } from '@/lib/response';
import { getAuthenticatedUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

const updateProfileSchema = z.object({
  full_name: z.string().min(2, 'Nama lengkap minimal 2 karakter').optional(),
  phone: z.string().min(8, 'Nomor HP minimal 8 digit').optional()
});

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || !user.authId) {
      return apiError('Pengguna tidak terautentikasi', 401);
    }

    // Ambil atau buat profil jika belum ada
    let profile = await prisma.profile.findUnique({
      where: { auth_user_id: user.authId }
    });

    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          auth_user_id: user.authId,
          full_name: user.email.split('@')[0] || 'Pelanggan',
          phone: '',
          email: user.email,
          role: 'customer'
        }
      });
    }

    // Hitung ringkasan servis
    const bookings = await prisma.booking.findMany({
      where: { customer_id: profile.id },
      select: {
        id: true,
        status: true,
        estimated_cost: true,
        final_cost: true,
        scheduled_at: true
      },
      orderBy: { scheduled_at: 'desc' }
    });

    const nonCancelledBookings = bookings.filter((b) => b.status !== 'dibatalkan');
    const completedBookings = bookings.filter((b) => b.status === 'selesai');

    const totalBookings = nonCancelledBookings.length;
    const totalSpent = completedBookings.reduce(
      // Sama dengan loyalty & dashboard: biaya akhir bila ada, kalau belum pakai estimasi.
      (sum, b) => sum + Number(b.final_cost ?? b.estimated_cost ?? 0),
      0
    );
    const lastServiceDate = completedBookings[0]?.scheduled_at ?? null;

    return apiSuccess(
      {
        profile,
        stats: {
          total_bookings: totalBookings,
          total_spent: totalSpent,
          last_service_date: lastServiceDate
        }
      },
      'Data profil berhasil diambil'
    );
  } catch (error: any) {
    return apiCatch(error, 'Gagal memuat profil');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || !user.authId) {
      return apiError('Pengguna tidak terautentikasi', 401);
    }

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Validasi gagal', 422);
    }

    const { full_name, phone } = parsed.data;

    const updated = await prisma.profile.update({
      where: { auth_user_id: user.authId },
      data: {
        ...(full_name ? { full_name } : {}),
        ...(phone !== undefined ? { phone: phone ?? '' } : {})
      }
    });

    // Update metadata di Supabase Auth
    try {
      const supabaseAdmin = getSupabaseAdmin();
      await supabaseAdmin.auth.admin.updateUserById(user.authId, {
        user_metadata: {
          full_name: updated.full_name,
          phone: updated.phone
        }
      });
    } catch {
      // Abaikan jika Supabase admin key belum diset
    }

    return apiSuccess(updated, 'Profil berhasil diperbarui');
  } catch (error: any) {
    return apiCatch(error, 'Gagal memperbarui profil');
  }
}
