import { NextRequest } from 'next/server';
import { prisma, UserRole } from '@servicego/database';
import { syncProfileSchema } from '@servicego/shared';
import { apiSuccess, apiError } from '@/lib/response';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const authId = request.headers.get('x-auth-id');
    const email = request.headers.get('x-user-email');

    if (!authId || !email) {
      return apiError('Data autentikasi pengguna tidak lengkap', 401);
    }

    const body = await request.json();
    const parsed = syncProfileSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Validasi gagal', 422, parsed.error.format());
    }

    const { full_name, phone, avatar_url, role } = parsed.data;

    // Upsert profil pengguna di database
    const profile = await prisma.profile.upsert({
      where: { auth_user_id: authId },
      update: {
        full_name,
        phone,
        avatar_url: avatar_url ?? undefined,
        ...(role ? { role: role as UserRole } : {})
      },
      create: {
        auth_user_id: authId,
        full_name,
        phone,
        email,
        avatar_url: avatar_url ?? null,
        role: (role as UserRole) || UserRole.customer
      }
    });

    // Update user metadata di Supabase Auth
    try {
      const supabaseAdmin = getSupabaseAdmin();
      await supabaseAdmin.auth.admin.updateUserById(authId, {
        user_metadata: {
          profile_id: profile.id,
          role: profile.role,
          full_name: profile.full_name
        },
        app_metadata: {
          role: profile.role
        }
      });
    } catch {
      // Abaikan jika Supabase admin key belum terhubung
    }

    return apiSuccess(profile, 'Profil berhasil disinkronisasi', 200);
  } catch (error: any) {
    return apiError(error.message || 'Gagal menyinkronkan profil', 500);
  }
}
