import { NextRequest } from 'next/server';
import { prisma, UserRole } from '@servicego/database';
import { syncProfileSchema } from '@servicego/shared';
import { apiSuccess, apiError } from '@/lib/response';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Sinkronkan profil untuk user yang sedang login.
 * - Dipanggil dengan body { full_name, phone, avatar_url? } dari halaman daftar: data profil diperbarui.
 * - Dipanggil TANPA body (auth-context saat login): profil dicari, dibuat kalau belum ada, tidak ditimpa.
 * Peran (role) TIDAK PERNAH diambil dari klien. Admin hanya bisa diatur langsung di database.
 */
export async function POST(request: NextRequest) {
  try {
    const authId = request.headers.get('x-auth-id');
    const email = request.headers.get('x-user-email');

    if (!authId || !email) {
      return apiError('Data autentikasi pengguna tidak lengkap', 401);
    }

    // Body boleh kosong. Sebelumnya request tanpa body selalu gagal 500 di request.json().
    const raw = await request.text();
    let body: unknown = null;
    if (raw.trim()) {
      try {
        body = JSON.parse(raw);
      } catch {
        return apiError('Format body tidak valid', 400);
      }
    }

    let profile;
    if (body && typeof body === 'object' && Object.keys(body as object).length > 0) {
      const parsed = syncProfileSchema.safeParse(body);
      if (!parsed.success) {
        return apiError(parsed.error.errors[0]?.message || 'Validasi gagal', 422, parsed.error.format());
      }
      const { full_name, phone, avatar_url } = parsed.data;
      profile = await prisma.profile.upsert({
        where: { auth_user_id: authId },
        update: { full_name, phone, avatar_url: avatar_url ?? undefined },
        create: {
          auth_user_id: authId,
          full_name,
          phone,
          email,
          avatar_url: avatar_url ?? null,
          role: UserRole.customer
        }
      });
    } else {
      profile = await prisma.profile.findUnique({ where: { auth_user_id: authId } });
      if (!profile) {
        // Nama & HP yang diisi saat daftar tersimpan di metadata signUp.
        let meta: { full_name?: string; phone?: string } = {};
        try {
          const { data } = await getSupabaseAdmin().auth.admin.getUserById(authId);
          meta = (data.user?.user_metadata ?? {}) as typeof meta;
        } catch {
          // metadata tidak wajib
        }
        profile = await prisma.profile.upsert({
          where: { auth_user_id: authId },
          update: {},
          create: {
            auth_user_id: authId,
            full_name: (meta.full_name || '').trim() || email.split('@')[0] || 'Pelanggan',
            phone: (meta.phone || '').trim(),
            email,
            role: UserRole.customer
          }
        });
      }
    }

    // Simpan profile_id & role ke metadata Supabase Auth supaya middleware tidak perlu query ulang.
    try {
      const supabaseAdmin = getSupabaseAdmin();
      await supabaseAdmin.auth.admin.updateUserById(authId, {
        user_metadata: {
          profile_id: profile.id,
          full_name: profile.full_name
        },
        // app_metadata hanya bisa diubah server (service role), jadi aman dipakai middleware.
        app_metadata: {
          role: profile.role,
          profile_id: profile.id
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
