import { NextRequest } from 'next/server';
import { prisma, UserRole } from '@servicego/database';
import { updateCustomerSchema } from '@servicego/shared';
import { apiSuccess, apiError, apiCatch } from '@/lib/response';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.profile.findFirst({
      where: { id, role: UserRole.customer }
    });

    if (!existing) {
      return apiError('Pelanggan tidak ditemukan', 404);
    }

    const body = await request.json();
    const parsed = updateCustomerSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Validasi gagal', 422, parsed.error.format());
    }

    const newEmail = parsed.data.email;
    if (newEmail && newEmail.toLowerCase() !== existing.email.toLowerCase()) {
      // Akun yang daftar sendiri login pakai email di Supabase Auth; mengubah email profil saja
      // membuat data tidak cocok. Email login hanya boleh diubah pemiliknya.
      const { error: authError } = await getSupabaseAdmin().auth.admin.getUserById(existing.auth_user_id);
      if (authError?.status !== 404) {
        return apiError('Pelanggan ini punya akun login sendiri, jadi emailnya hanya bisa diubah oleh pelanggan tersebut.', 422);
      }
      const duplicate = await prisma.profile.findFirst({
        where: { email: { equals: newEmail, mode: 'insensitive' }, id: { not: id } }
      });
      if (duplicate) {
        return apiError('Email ini sudah dipakai pelanggan lain', 409);
      }
    }

    const updated = await prisma.profile.update({
      where: { id },
      data: parsed.data
    });

    return apiSuccess(updated, 'Data pelanggan berhasil diperbarui');
  } catch (error: any) {
    return apiCatch(error, 'Gagal memperbarui data pelanggan');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.profile.findFirst({
      where: { id, role: UserRole.customer }
    });

    if (!existing) {
      return apiError('Pelanggan tidak ditemukan', 404);
    }

    // Booking menyimpan riwayat servis dan pembayaran; vehicles -> bookings memakai onDelete: Restrict,
    // jadi pelanggan yang sudah pernah booking tidak dihapus. Tabel profiles belum punya kolom nonaktif.
    const bookingCount = await prisma.booking.count({ where: { customer_id: id } });
    if (bookingCount > 0) {
      return apiError(
        `Pelanggan ini punya ${bookingCount} riwayat booking, jadi tidak bisa dihapus agar riwayat servis dan pembayarannya tetap utuh. Ubah datanya saja bila perlu, atau biarkan akunnya tanpa booking baru.`,
        409,
        { booking_count: bookingCount }
      );
    }

    // Tanpa booking: hapus kendaraan dulu, lalu profil, dalam satu transaksi
    const [deletedVehicles] = await prisma.$transaction([
      prisma.vehicle.deleteMany({ where: { owner_id: id } }),
      prisma.profile.delete({ where: { id } })
    ]);

    return apiSuccess(
      { vehicles_deleted: deletedVehicles.count },
      deletedVehicles.count > 0
        ? `Pelanggan dan ${deletedVehicles.count} kendaraannya berhasil dihapus`
        : 'Pelanggan berhasil dihapus'
    );
  } catch (error: any) {
    return apiCatch(error, 'Gagal menghapus data pelanggan');
  }
}
